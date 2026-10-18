const test = require('node:test')
const assert = require('node:assert/strict')
const cheerio = require('cheerio')
const { BUTTONDOWN_FEED_URL, fetchButtondownPosts, parseButtondownFeed, sanitizeButtondownHtml } = require('./buttondown')

const now = Date.parse('2026-10-18T12:00:00Z')
const url = 'https://buttondown.com/joshuavoydik/archive/a-first-letter/'
const item = ({ title = 'A first letter &amp; more', link = url, guid = link, date = 'Sat, 17 Oct 2026 18:00:00 GMT', body = '<p>The complete letter.</p>', extra = '' } = {}) => `<item><title>${title}</title><link>${link}</link><guid>${guid}</guid><pubDate>${date}</pubDate><description><![CDATA[${body}]]></description>${extra}</item>`
const feed = (items = '', channelLink = 'https://buttondown.com/joshuavoydik') => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Joshua Voydik</title><link>${channelLink}</link><description>Letters</description>${items}</channel></rss>`

test('parses full RSS HTML, CDATA, metadata, and content:encoded precedence', () => {
  const [post] = parseButtondownFeed(feed(item({ extra: '<content:encoded><![CDATA[<h2>A heading</h2><p>Full <em>essay</em>.</p><figure><img src="https://images.example.com/photo.jpg" alt="A view"><figcaption>A caption.</figcaption></figure>]]></content:encoded><atom:updated>2026-10-18T01:00:00Z</atom:updated>' })), { now })
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
  assert.equal(post.source.provider, 'buttondown')
  assert.equal(post.source.postId, url)
  assert.equal(post.source.canonicalUrl, url)
})

test('uses description HTML, supports own canonical URLs, and sorts newest first', () => {
  const posts = parseButtondownFeed(feed(item({ link: 'https://voydik.com/writing/older', date: 'Fri, 16 Oct 2026 18:00:00 GMT', body: '<p>Older &amp; wiser.</p>' }) + item({ link: 'https://buttondown.email/joshuavoydik/archive/latest/' })), { now })
  assert.deepEqual(posts.map(post => post.slug), ['latest', 'older'])
  assert.equal(posts[1].description, 'Older & wiser.')
  assert.equal(posts[1].lastModified, posts[1].date)
  assert.equal(parseButtondownFeed(feed(item({ link: 'https://www.voydik.com/writing/first' })), { now })[0].slug, 'first')
})

test('sanitizes active content and retains article formatting and safe media', () => {
  const html = sanitizeButtondownHtml(`<script>secretScript()</script><style>secretStyle</style><form><p>secretForm</p><input value="secretInput"></form><p onclick="secretEvent()">Text <a href="javascript:secretLink()">link</a><a href="data:text/html,secretData">data</a></p><img src="data:image/svg+xml,secretImage"><img src="//evil.example/image"><img src="http://evil.example/image"><img src="/writing/photo.jpg" onerror="secretError()"><img src="https://images.example.com/photo.jpg"><iframe src="https://evil.example/embed/video"></iframe><iframe src="https://www.youtube.com/watch?v=bad"></iframe><iframe src="https://www.youtube-nocookie.com/embed/abc123" onload="secretFrame()"></iframe><iframe src="https://open.spotify.com/embed/track/Abc123"></iframe><table><tr><th>One</th><td>Two</td></tr></table>`)
  assert.doesNotMatch(html, /secret|javascript:|data:|onerror|onclick|onload|<form|<script|<style/)
  const $ = cheerio.load(html)
  assert.equal($('img').length, 2)
  assert.equal($('img').first().attr('src'), '/writing/photo.jpg')
  assert.equal($('iframe').length, 2)
  assert.ok($('iframe').toArray().every(node => $(node).attr('loading') === 'lazy'))
  assert.equal($('td').text(), 'Two')
})

test('rejects malformed feeds and missing required fields instead of returning empty', () => {
  for (const xml of ['', '<html>upstream error</html>', '<rss version="2.0"><channel></rss>', feed(item()).replace('</item>', ''), feed(item()).replace('<pubDate>', '<missing>'), feed(item({ date: 'not a date' })), feed(item({ title: '' })), feed(item({ body: '<script>gone()</script>' })), '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + feed(), feed().replace('version="2.0"', 'version=2.0')]) {
    assert.throws(() => parseButtondownFeed(xml, { now }), /Buttondown feed:/)
  }
  assert.deepEqual(parseButtondownFeed(feed(), { now }), [])
})

test('rejects wrong owners, unsafe slugs, and identifier mismatches', () => {
  for (const link of ['https://buttondown.com/other/archive/a-first-letter/', 'https://buttondown.com.evil.example/joshuavoydik/archive/a-first-letter/', 'https://buttondown.com/joshuavoydik/archive/%2fetc/', 'https://buttondown.com/joshuavoydik/archive/a.b/', 'https://voydik.com/other/a-first-letter', 'http://buttondown.com/joshuavoydik/archive/a-first-letter/', 'https://user@buttondown.com/joshuavoydik/archive/a-first-letter/']) {
    assert.throws(() => parseButtondownFeed(feed(item({ link })), { now }), /Buttondown feed:/)
  }
  assert.throws(() => parseButtondownFeed(feed(item(), 'https://buttondown.com/other'), { now }), /wrong publication/)
  assert.throws(() => parseButtondownFeed(feed(item({ guid: 'https://buttondown.com/joshuavoydik/archive/different/' })), { now }), /identifier mismatch/)
})

test('omits future entries and rejects duplicate ids or slugs', () => {
  assert.deepEqual(parseButtondownFeed(feed(item({ date: 'Mon, 19 Oct 2026 18:00:00 GMT' })), { now }), [])
  assert.throws(() => parseButtondownFeed(feed(item({ guid: 'stable-id' }) + item({ link: 'https://voydik.com/writing/another', guid: 'stable-id' })), { now }), /duplicate/)
  assert.throws(() => parseButtondownFeed(feed(item({ guid: 'first-id' }) + item({ guid: 'second-id' })), { now }), /duplicate/)
  assert.throws(() => parseButtondownFeed(feed('<item/>'.repeat(10000)), { now }), /RSS item limit/)
})

test('fetches only the fixed public RSS URL with timeout and validates responses', async () => {
  const posts = await fetchButtondownPosts({ now, fetchImpl: async (requestUrl, options) => {
    assert.equal(requestUrl, BUTTONDOWN_FEED_URL)
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    return new Response(feed(item()), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
  } })
  assert.equal(posts.length, 1)
  for (const response of [new Response('private upstream body', { status: 503 }), new Response('<html>failure</html>', { headers: { 'content-type': 'text/html' } }), new Response(feed(), { headers: { 'content-type': 'text/xml', 'content-length': '10485761' } }), new Response('x'.repeat(10485761), { headers: { 'content-type': 'text/xml' } })]) {
    await assert.rejects(fetchButtondownPosts({ fetchImpl: async () => response }), cause => cause.message.startsWith('Buttondown feed:') && !cause.message.includes('private upstream body'))
  }
  await assert.rejects(fetchButtondownPosts({ fetchImpl: async () => { throw new Error('private error details') } }), /Buttondown feed: request failed or timed out/)
})
