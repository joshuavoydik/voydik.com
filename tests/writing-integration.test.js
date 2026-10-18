const test = require('node:test')
const assert = require('node:assert/strict')
const { mergeWriting, getWritingSlugs, getLocalWritingPost } = require('../lib/writing')
const { renderFeed, renderSitemap } = require('../lib/syndication')

function published(slug, body = '<p>New writing</p>') {
  return { slug, title: 'New writing', date: '2026-10-18T12:00:00.000Z', lastModified: '2026-10-18T12:00:00.000Z', description: 'New writing', html: body, sourceUrl: `https://buttondown.com/joshuavoydik/archive/${slug}/`, source: { provider: 'buttondown', postId: `published-${slug}` } }
}

test('new published writing joins the existing archive and discovery feeds', () => {
  const local = getWritingSlugs().map(getLocalWritingPost)
  const merged = mergeWriting(local, [published('new-publication')])
  assert.equal(merged.length, local.length + 1)
  assert.equal(merged[0].slug, 'new-publication')
  assert.match(renderSitemap(merged), /https:\/\/voydik.com\/writing\/new-publication/)
  assert.match(renderFeed(merged), /https:\/\/voydik.com\/writing\/new-publication/)
  assert.ok(local.every(post => merged.some(item => item.slug === post.slug)))
})

test('removed essays stay excluded even if republished in Buttondown', () => {
  const removed = ['how-to-win-the-fight-for-america', 'bill-ackman-on-dei']
  const merged = mergeWriting([], removed.map(slug => published(slug)))
  assert.deepEqual(merged, [])
})

test('a new essay with an existing slug cannot overwrite migrated writing', () => {
  const local = { ...published('same-title'), html: '<p>Original writing</p>', source: { provider: 'substack' } }
  const merged = mergeWriting([local], [published('same-title')])
  assert.equal(merged.length, 2)
  assert.equal(merged.find(post => post.slug === 'same-title').html, '<p>Original writing</p>')
  assert.match(merged.find(post => post.source.provider === 'buttondown').slug, /^same-title-[a-f0-9]{8}$/)
})

test('links between public Buttondown posts point to local essay pages', () => {
  const merged = mergeWriting([], [published('one', '<p><a href="https://buttondown.com/joshuavoydik/archive/two/#section">Read two</a></p>'), published('two')])
  assert.match(merged.find(post => post.slug === 'one').html, /href="\/writing\/two#section"/)
})
