const cheerio = require('cheerio')
const sanitizeHtml = require('sanitize-html')

const SUBSTACK_FEED_URL = 'https://joshua.substack.com/feed'
const MAX_FEED_BYTES = 10 * 1024 * 1024
const SLUG = '[a-z0-9]+(?:[-_][a-z0-9]+)*'
const error = (message) => new Error(`Substack feed: ${message}`)

// Cheerio's XML parser repairs malformed input. Check nesting first so a broken
// response cannot quietly replace the previously published collection.
function validateXml(xml) {
  const stack = []
  let roots = 0
  let offset = 0
  const validEntities = (text) => !/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/i.test(text)
  while (offset < xml.length) {
    const rest = xml.slice(offset)
    if (!rest.startsWith('<')) {
      const end = xml.indexOf('<', offset)
      const text = xml.slice(offset, end < 0 ? xml.length : end)
      if ((!stack.length && text.trim()) || !validEntities(text)) throw error('invalid XML text')
      offset += text.length
      continue
    }
    const special = rest.match(/^(?:<!--[\s\S]*?-->|<\?[^?]*\?>|<!\[CDATA\[[\s\S]*?\]\]>)/)
    if (special) {
      if (rest.startsWith('<![CDATA[') && !stack.length) throw error('invalid XML content')
      offset += special[0].length
      continue
    }
    const close = rest.match(/^<\/([A-Za-z_][\w:.-]*)\s*>/)
    if (close) {
      if (stack.pop() !== close[1]) throw error('unbalanced XML')
      offset += close[0].length
      continue
    }
    const open = rest.match(/^<([A-Za-z_][\w:.-]*)(?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*\s*\/?>/)
    if (!open || !validEntities(open[0])) throw error('invalid XML element')
    if (!stack.length) roots++
    if (!open[0].endsWith('/>')) stack.push(open[1])
    offset += open[0].length
  }
  if (stack.length || roots !== 1) throw error('incomplete XML document')
}

function archiveUrl(value) {
  let url
  try { url = new URL(value) } catch { throw error('invalid article URL') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) {
    throw error('invalid article URL')
  }
  const prefix = url.hostname === 'joshua.substack.com' ? '/p/' : null
  const match = prefix && url.pathname.match(new RegExp(`^${prefix}(${SLUG})/?$`))
  if (!match || match[1].length > 200) throw error('article URL is outside this publication')
  return { slug: match[1], url: url.href }
}

function safeImage(src = '') {
  if (!src || /[\\\u0000-\u0020]/.test(src)) return false
  if (src.startsWith('/') && !src.startsWith('//')) return true
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch { return false }
}

function safeEmbed(src = '') {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || /[\\\u0000-\u0020]/.test(src)) return false
    if (['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(url.hostname)) {
      return /^\/embed\/[\w-]+\/?$/.test(url.pathname)
    }
    return url.hostname === 'open.spotify.com' && /^\/embed\/(?:track|album|playlist|artist|episode|show)\/[a-zA-Z0-9]+\/?$/.test(url.pathname)
  } catch { return false }
}

function sanitizeSubstackHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 's', 'del', 'u', 'a', 'span', 'div', 'figure', 'figcaption', 'img', 'iframe', 'sup', 'sub', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'],
    nonTextTags: ['script', 'style', 'textarea', 'option', 'form', 'button', 'svg', 'math', 'noscript', 'template'],
    allowedAttributes: {
      '*': ['id'],
      a: ['href', 'title', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
      iframe: ['src', 'title', 'width', 'height', 'loading', 'allowfullscreen', 'referrerpolicy'],
      ol: ['start'], li: ['value'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan']
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'], iframe: ['https'] },
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => (frame.tag === 'img' && !safeImage(frame.attribs.src)) || (frame.tag === 'iframe' && !safeEmbed(frame.attribs.src)),
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy', decoding: 'async' } }),
      iframe: (tagName, attribs) => ({ tagName, attribs: { ...attribs, title: attribs.title || 'Embedded media', loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin' } })
    }
  }).trim()
}

function plainText(html) {
  const $ = cheerio.load(html, null, false)
  $('br').replaceWith(' ')
  $('p, div, li, blockquote, figure, figcaption, h1, h2, h3, h4, h5, h6, pre, tr').append(' ')
  return $.text().replace(/\s+/g, ' ').trim()
}

function parseSubstackFeed(xml, { now = Date.now() } = {}) {
  if (typeof xml !== 'string' || !xml.trim() || Buffer.byteLength(xml) > MAX_FEED_BYTES) throw error('empty or oversized response')
  validateXml(xml.replace(/^\uFEFF/, ''))
  const $ = cheerio.load(xml, { xml: true })
  const rss = $.root().children('rss')
  const channel = rss.children('channel')
  if (rss.length !== 1 || rss.attr('version') !== '2.0' || channel.length !== 1 || $('item').length !== channel.children('item').length) {
    throw error('expected an RSS 2.0 channel')
  }
  if (channel.children('item').length >= 10000) throw error('archive reached the RSS item limit')
  if (!Number.isFinite(Number(now))) throw error('invalid current time')
  const read = (node, name, required = false) => {
    const fields = node.children().filter((_, field) => field.tagName === name)
    const value = fields.text().trim()
    if (fields.length > 1 || (required && !value)) throw error(`missing or duplicate ${name}`)
    return value
  }
  const channelLink = read(channel, 'link', true)
  if (!/^https:\/\/joshua\.substack\.com\/?$/.test(channelLink)) throw error('wrong publication channel')
  read(channel, 'title', true)
  const ids = new Set()
  const slugs = new Set()
  const parseDate = (value) => {
    const date = new Date(value)
    if (!value || value.length > 100 || !Number.isFinite(date.getTime())) throw error('invalid article date')
    return date.toISOString()
  }
  const posts = channel.children('item').map((_, item) => {
    const node = $(item)
    const title = read(node, 'title', true)
    if (title.length > 1000) throw error('article title is too long')
    const { slug, url: sourceUrl } = archiveUrl(read(node, 'link', true))
    const postId = read(node, 'guid') || sourceUrl
    if (postId.length > 2048) throw error('article identifier is too long')
    if (/^https?:/i.test(postId) && archiveUrl(postId).slug !== slug) throw error('article identifier mismatch')
    if (ids.has(postId) || slugs.has(slug)) throw error('duplicate article identifier or slug')
    ids.add(postId)
    slugs.add(slug)
    const date = parseDate(read(node, 'pubDate', true))
    const updated = read(node, 'atom:updated') || read(node, 'updated') || read(node, 'dcterms:modified')
    const lastModified = updated ? parseDate(updated) : date
    const body = read(node, 'content:encoded') || read(node, 'description', true)
    // Only the unauthenticated public RSS body is mirrored. Never request a
    // subscriber feed or attempt to unlock restricted text.
    const html = sanitizeSubstackHtml(body)
    const text = plainText(html)
    if (!html || (!text && !/<(?:img|iframe)\b/.test(html))) throw error('article body is empty')
    return {
      slug, title, subtitle: '',
      description: text.length > 240 ? `${text.slice(0, 239).trimEnd()}…` : text || title,
      date,
      displayDate: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(date)),
      year: new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(date)),
      readingMinutes: Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 220)),
      sourceUrl, html, lastModified,
      source: { provider: 'substack', postId, canonicalUrl: sourceUrl, publishedAt: date, updatedAt: lastModified }
    }
  }).get()
  return posts.filter((post) => new Date(post.date).getTime() <= Number(now)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
}

async function fetchSubstackPosts({ fetchImpl = fetch, now = Date.now(), timeoutMs = 10000 } = {}) {
  try {
    const response = await fetchImpl(SUBSTACK_FEED_URL, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' }
    })
    if (!response.ok) throw error(`HTTP ${response.status}`)
    if (!/^(?:application\/(?:rss\+xml|xml)|text\/xml)(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw error('unexpected content type')
    const declaredSize = response.headers.get('content-length')
    if (declaredSize && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > MAX_FEED_BYTES)) throw error('oversized response')
    if (!response.body) throw error('missing response body')
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_FEED_BYTES) throw error('oversized response')
        chunks.push(Buffer.from(value))
      }
    } catch (cause) {
      await reader.cancel().catch(() => {})
      throw cause
    } finally { reader.releaseLock() }
    return parseSubstackFeed(Buffer.concat(chunks).toString('utf8'), { now })
  } catch (cause) {
    // Never include upstream response bodies or arbitrary fetch error messages.
    if (cause instanceof Error && cause.message.startsWith('Substack feed: ')) throw cause
    throw error('request failed or timed out')
  }
}

module.exports = { SUBSTACK_FEED_URL, fetchSubstackPosts, parseSubstackFeed, sanitizeSubstackHtml }
