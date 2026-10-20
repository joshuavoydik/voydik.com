const test = require('node:test')
const assert = require('node:assert/strict')
const cheerio = require('cheerio')
const { SUBSTACK_FEED_URL, fetchSubstackPosts, parseSubstackFeed, sanitizeSubstackHtml } = require('./substack')

const now = Date.parse('2026-10-18T12:00:00Z')
const url = 'https://joshua.substack.com/p/a-first-letter/'
const item = ({ title = 'A first letter &amp; more', link = url, guid = link, date = 'Sat, 17 Oct 2026 18:00:00 GMT', body = '<p>The complete letter.</p>', extra = '' } = {}) => `<item><title>${title}</title><link>${link}</link><guid>${guid}</guid><pubDate>${date}</pubDate><description><![CDATA[${body}]]></description>${extra}</item>`
const feed = (items = '', channelLink = 'https://joshua.substack.com') => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Joshua Voydik</title><link>${channelLink}</link><description>Letters</description>${items}</channel></rss>`

test('parses full RSS HTML, CDATA, metadata, and content:encoded precedence', () => {
  const [post] = parseSubstackFeed(feed(item({ extra: '<content:encoded><![CDATA[<h2>A heading</h2><p>Full <em>essay</em>.</p><figure><img src="https://images.example.com/photo.jpg" alt="A view"><figcaption>A caption.</figcaption></figure>]]></content:encoded><atom:updated>2026-10-18T01:00:00Z</atom:updated>' })), { now })
  assert.equal(post.slug, 'a-first-letter')
  assert.equal(post.title, 'A first letter & more')
  assert.match(post.html, /<h2>A heading<\/h2>/)
  assert.match(post.html, /<figcaption>A caption\.<\/figcaption>/)
  assert.doesNotMatch(post.html, /complete letter/)
  assert.equal(post.description, 'A heading Full essay. A caption.')
  assert.equal(post.date, '2026-10-17T18:00:00.000Z')
  assert.equal(post.displayDate, 'October 17, 2026')
  assert.equal(post.year, '2026')
  assert.equal(post.readingMinutes, 1)
  assert.equal(post.lastModified, '2026-10-18T01:00:00.000Z')
  assert.equal(post.source.provider, 'substack')
  assert.equal(post.source.postId, url)
  assert.equal(post.source.canonicalUrl, url)
})

test('uses description HTML and sorts newest first', () => {
  const posts = parseSubstackFeed(feed(item({ link: 'https://joshua.substack.com/p/older', date: 'Fri, 16 Oct 2026 18:00:00 GMT', body: '<p>Older &amp; wiser.</p>' }) + item({ link: 'https://joshua.substack.com/p/latest/' })), { now })
  assert.deepEqual(posts.map(post => post.slug), ['latest', 'older'])
  assert.equal(posts[1].description, 'Older & wiser.')
  assert.equal(posts[1].lastModified, posts[1].date)
  assert.equal(parseSubstackFeed(feed(item({ link: 'https://joshua.substack.com/p/first' })), { now })[0].slug, 'first')
})

test('sanitizes active content and retains article formatting and safe media', () => {
  const html = sanitizeSubstackHtml(`<script>secretScript()</script><style>secretStyle</style><form><p>secretForm</p><input value="secretInput"></form><p onclick="secretEvent()">Text <a href="javascript:secretLink()">link</a><a href="data:text/html,secretData">data</a></p><img src="data:image/svg+xml,secretImage"><img src="//evil.example/image"><img src="http://evil.example/image"><img src="/writing/photo.jpg" onerror="secretError()"><img src="https://images.example.com/photo.jpg"><iframe src="https://evil.example/embed/video"></iframe><iframe src="https://www.youtube.com/watch?v=bad"></iframe><iframe src="https://www.youtube-nocookie.com/embed/abc123" onload="secretFrame()"></iframe><iframe src="https://open.spotify.com/embed/track/Abc123"></iframe><table><tr><th>One</th><td>Two</td></tr></table>`)
  assert.doesNotMatch(html, /secret|javascript:|data:|onerror|onclick|onload|<form|<script|<style/)
  const $ = cheerio.load(html)
  assert.equal($('img').length, 2)
  assert.equal($('img').first().attr('src'), '/writing/photo.jpg')
  assert.equal($('iframe').length, 2)
  assert.ok($('iframe').toArray().every(node => $(node).attr('loading') === 'lazy'))
  assert.equal($('td').text(), 'Two')
})

test('mirrors only a public teaser without inventing a full paid article', () => {
  const [post] = parseSubstackFeed(feed(item({
    body: '<p>Public introduction only.</p><p><a href="https://joshua.substack.com/subscribe">Subscribe to continue reading</a></p>'
  })), { now })
  assert.match(post.html, /Public introduction only/)
  assert.match(post.html, /https:\/\/joshua.substack.com\/subscribe/)
  assert.equal(post.sourceUrl, url)
})

test('rejects malformed feeds and missing required fields instead of returning empty', () => {
  for (const xml of ['', '<html>upstream error</html>', '<rss version="2.0"><channel></rss>', feed(item()).replace('</item>', ''), feed(item()).replace('<pubDate>', '<missing>'), feed(item({ date: 'not a date' })), feed(item({ title: '' })), feed(item({ body: '<script>gone()</script>' })), '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + feed(), feed().replace('version="2.0"', 'version=2.0')]) {
    assert.throws(() => parseSubstackFeed(xml, { now }), /Substack feed:/)
  }
  assert.deepEqual(parseSubstackFeed(feed(), { now }), [])
})

test('rejects wrong owners, unsafe slugs, and identifier mismatches', () => {
  for (const link of ['https://other.substack.com/p/a-first-letter', 'https://joshua.substack.com.evil.example/p/a-first-letter', 'https://joshua.substack.com/p/%2fetc/', 'https://joshua.substack.com/p/a.b/', 'https://voydik.com/other/a-first-letter', 'http://joshua.substack.com/p/a-first-letter', 'https://user@joshua.substack.com/p/a-first-letter']) {
    assert.throws(() => parseSubstackFeed(feed(item({ link })), { now }), /Substack feed:/)
  }
  assert.throws(() => parseSubstackFeed(feed(item(), 'https://other.substack.com'), { now }), /wrong publication/)
  assert.throws(() => parseSubstackFeed(feed(item({ guid: 'https://joshua.substack.com/p/different/' })), { now }), /identifier mismatch/)
})

test('omits future entries and rejects duplicate ids or slugs', () => {
  assert.deepEqual(parseSubstackFeed(feed(item({ date: 'Mon, 19 Oct 2026 18:00:00 GMT' })), { now }), [])
  assert.throws(() => parseSubstackFeed(feed(item({ guid: 'stable-id' }) + item({ link: 'https://joshua.substack.com/p/another', guid: 'stable-id' })), { now }), /duplicate/)
  assert.throws(() => parseSubstackFeed(feed(item({ guid: 'first-id' }) + item({ guid: 'second-id' })), { now }), /duplicate/)
  assert.throws(() => parseSubstackFeed(feed('<item/>'.repeat(10000)), { now }), /RSS item limit/)
})

test('fetches only the fixed public RSS URL with timeout and validates responses', async () => {
  const posts = await fetchSubstackPosts({ now, fetchImpl: async (requestUrl, options) => {
    assert.equal(requestUrl, SUBSTACK_FEED_URL)
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    return new Response(feed(item()), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
  } })
  assert.equal(posts.length, 1)
  for (const response of [new Response('private upstream body', { status: 503 }), new Response('<html>failure</html>', { headers: { 'content-type': 'text/html' } }), new Response(feed(), { headers: { 'content-type': 'text/xml', 'content-length': '10485761' } }), new Response('x'.repeat(10485761), { headers: { 'content-type': 'text/xml' } })]) {
    await assert.rejects(fetchSubstackPosts({ fetchImpl: async () => response }), cause => cause.message.startsWith('Substack feed:') && !cause.message.includes('private upstream body'))
  }
  await assert.rejects(fetchSubstackPosts({ fetchImpl: async () => { throw new Error('private error details') } }), /Substack feed: request failed or timed out/)
})
