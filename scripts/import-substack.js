/*
 * Import only Joshua's publicly published Substack archive. Requires Node 22.12+
 * and curl. Raw responses stay in a private OS temp directory, outside Git.
 * Optional: --source-dir /path/to/public-snapshot containing archive.json and
 * posts/<slug>.json. Re-run without it to retrieve the current public archive.
 * This command never reads accounts, drafts, subscriber data, or credentials.
 */
const fs = require('fs/promises')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { execFile } = require('child_process')
const { promisify } = require('util')
const cheerio = require('cheerio')
const sanitizeHtml = require('sanitize-html')
const sharp = require('sharp')

const execFileAsync = promisify(execFile)
const ROOT = path.join(__dirname, '..')
const ORIGIN = 'https://joshua.substack.com'
const CONTENT = path.join(ROOT, 'content', 'writing')
const MEDIA = path.join(ROOT, 'public', 'writing')
const REPORT = path.join(ROOT, 'data', 'writing-import.json')
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex')
const plainText = (html) => {
  const $ = cheerio.load(html, null, false)
  $('br').replaceWith('\n')
  $('p, div, li, blockquote, figure, figcaption, h1, h2, h3, h4, h5, h6, pre, tr').append('\n')
  return $.text().replace(/\s+/g, ' ').trim()
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function attributeData(element) {
  try { return JSON.parse(element.attr('data-attrs') || '{}') } catch { return {} }
}

function originalImage(url) {
  if (!url) return ''
  if (url.startsWith('https://substackcdn.com/image/fetch/')) {
    const encoded = url.match(/\/(https?%3A%2F%2F.*)$/i)
    if (encoded) return decodeURIComponent(encoded[1])
    const raw = url.indexOf('/https://')
    if (raw !== -1) return url.slice(raw + 1)
  }
  return url
}

async function download(url) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') throw new Error(`Refusing non-HTTPS asset: ${url}`)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { stdout } = await execFileAsync('curl', [
        '--fail', '--location', '--silent', '--show-error', '--max-time', '60',
        '--proto', '=https', '--proto-redir', '=https', url
      ], { encoding: 'buffer', maxBuffer: 40 * 1024 * 1024 })
      return stdout
    } catch (error) {
      if (attempt === 4 || /error: (?:403|404)/.test(String(error.stderr))) throw new Error(`Download failed: ${url}: ${error.stderr || error.message}`)
      await sleep(1000 * (attempt + 1))
    }
  }
}

async function mapLimit(items, limit, fn) {
  let next = 0
  const results = new Array(items.length)
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index], index)
    }
  }))
  return results
}

function imageExtension(buffer) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg'
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (buffer.subarray(0, 3).toString() === 'GIF') return 'gif'
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp'
  if (buffer.subarray(4, 12).toString().startsWith('ftypavif')) return 'avif'
  throw new Error('Unrecognized image bytes; refusing to save an error response as an image')
}

function prepareBody(post) {
  const $ = cheerio.load(post.body_html, null, false)
  const removed = []
  $('.subscription-widget-wrap-editor, .image-link-expand, script, style, form, button').each((_, node) => {
    removed.push(plainText($.html(node)))
    $(node).remove()
  })
  $('.button-wrapper').each((_, node) => {
    const link = $(node).find('a').first()
    const href = link.attr('href') || ''
    if (/substack\.com\/(?:subscribe|publish|p\/[^/]+\/(?:comments|share))/.test(href) ||
        (/substack\.com\//.test(href) && /[?&]action=share(?:&|$)/.test(href)) ||
        /^(?:Share|Leave a comment|Subscribe|Get the app|Restack|Like)$/i.test(link.text().trim())) {
      removed.push($(node).text().trim())
      $(node).remove()
    }
  })
  // The public HTML stores tweet text in data attributes instead of visible DOM.
  // Render that original text statically, with attribution and its source link.
  $('.twitter-embed').each((_, node) => {
    const data = attributeData($(node))
    if (!data.url) throw new Error(`Twitter embed lacks a source URL in ${post.slug}`)
    const quote = $('<blockquote class="embedded-quote"></blockquote>')
    if (data.full_text) quote.append($('<p></p>').html(data.full_text.replace(/\n/g, '<br>')))
    for (const photo of data.photos || []) {
      const src = typeof photo === 'string' ? photo : photo.url || photo.media_url_https
      if (src) quote.append($('<img>').attr({ src, alt: '' }))
    }
    quote.append($('<p></p>').append($('<a></a>').attr('href', data.url).text(data.name ? `${data.name} (@${data.username})` : 'View original post')))
    $(node).replaceWith(quote)
  })
  $('iframe').each((_, node) => {
    const frame = $(node)
    const src = frame.attr('src') || ''
    const url = new URL(src)
    if (['www.youtube-nocookie.com', 'www.youtube.com', 'www.youtube.com'].includes(url.hostname)) {
      frame.attr({ title: `Video in ${post.title.trim()}`, loading: 'lazy', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin' })
      frame.parent().addClass('embed-video')
    } else if (url.hostname === 'open.spotify.com') {
      frame.attr({ title: `Spotify in ${post.title.trim()}`, loading: 'lazy' })
      frame.parent().addClass('embed-audio')
    } else {
      frame.replaceWith($('<p></p>').append($('<a></a>').attr('href', src).text(`Open embedded content: ${url.hostname}`)))
    }
  })
  return { $, removed: removed.filter(Boolean) }
}

function sanitize(html) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 's', 'del', 'u', 'a', 'span', 'div', 'figure', 'figcaption', 'img', 'iframe', 'sup', 'sub', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: {
      '*': ['id'],
      a: ['href', 'title', 'rel'],
      div: ['class'], blockquote: ['class'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
      iframe: ['src', 'title', 'width', 'height', 'loading', 'allowfullscreen', 'referrerpolicy'],
      ol: ['start'], li: ['value'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan']
    },
    allowedClasses: { div: ['captioned-image-container', 'embed-video', 'embed-audio'], blockquote: ['embedded-quote'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'], iframe: ['https'] },
    allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.youtube.com', 'open.spotify.com'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } })
    }
  })
}

async function main() {
  const args = process.argv.slice(2)
  const sourceIndex = args.indexOf('--source-dir')
  const sourceDirectory = sourceIndex >= 0 ? path.resolve(args[sourceIndex + 1]) : await fs.mkdtemp(path.join(os.tmpdir(), 'voydik-public-substack-'))
  await fs.mkdir(path.join(sourceDirectory, 'posts'), { recursive: true })
  let archive
  if (sourceIndex >= 0) {
    archive = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'archive.json'), 'utf8'))
  } else {
    archive = []
    for (let offset = 0; ; offset += 20) {
      const page = JSON.parse(await download(`${ORIGIN}/api/v1/archive?sort=new&offset=${offset}&limit=20`))
      archive.push(...page)
      if (page.length < 20) break
    }
    await fs.writeFile(path.join(sourceDirectory, 'archive.json'), JSON.stringify(archive, null, 2))
  }
  if (!archive.length || new Set(archive.map((post) => post.slug)).size !== archive.length) throw new Error('Empty or duplicate public archive')
  if (archive.some((post) => !/^[a-z0-9]+(?:-[a-z0-9]*)*$/.test(post.slug))) throw new Error('Invalid public post slug')
  const allSlugs = new Set(archive.map((post) => post.slug))
  const posts = await mapLimit(archive, 3, async (meta) => {
    const sourcePath = path.join(sourceDirectory, 'posts', `${meta.slug}.json`)
    let post
    try { post = JSON.parse(await fs.readFile(sourcePath, 'utf8')) } catch {
      post = JSON.parse(await download(`${ORIGIN}/api/v1/posts/${encodeURIComponent(meta.slug)}`))
      await fs.writeFile(sourcePath, JSON.stringify(post, null, 2))
    }
    if (!post.is_published || post.audience !== 'everyone' || post.free_unlock_required || post.id !== meta.id || typeof post.body_html !== 'string') {
      throw new Error(`Refusing unpublished, restricted, or mismatched content: ${meta.slug}`)
    }
    return { post, ...prepareBody(post) }
  })
  await fs.mkdir(CONTENT, { recursive: true })
  await fs.mkdir(MEDIA, { recursive: true })
  let previousAssets = []
  try { previousAssets = JSON.parse(await fs.readFile(REPORT, 'utf8')).assets || [] } catch {}
  const mediaCachePath = path.join(sourceDirectory, 'media-cache.json')
  try { previousAssets.push(...JSON.parse(await fs.readFile(mediaCachePath, 'utf8'))) } catch {}
  const cachedAssets = new Map(previousAssets.map((asset) => [asset.sourceUrl, asset]))
  let cacheWrites = Promise.resolve()
  async function completeAsset(asset, bytes) {
    let validDisplay = false
    if (asset.displayPath && asset.displaySha256) {
      try { validDisplay = hash(await fs.readFile(path.join(ROOT, 'public', asset.displayPath))) === asset.displaySha256 } catch {}
    }
    if (!validDisplay) {
      const display = await sharp(bytes, { animated: true }).rotate()
        .resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true })
      const displaySha256 = hash(display.data)
      asset = {
        ...asset, displayPath: `writing/${displaySha256.slice(0, 24)}.webp`,
        displaySha256, displayBytes: display.data.length,
        width: display.info.width, height: display.info.height
      }
      await fs.writeFile(path.join(ROOT, 'public', asset.displayPath), display.data)
    }
    cachedAssets.set(asset.sourceUrl, asset)
    cacheWrites = cacheWrites.then(() => fs.writeFile(mediaCachePath, JSON.stringify([...cachedAssets.values()], null, 2)))
    await cacheWrites
    return asset
  }
  const imageUrls = new Set()
  const browserImageSources = new Map()
  posts.forEach(({ $ }) => $('img').each((_, node) => {
    const image = $(node)
    const src = originalImage(attributeData(image).src || image.attr('src'))
    if (!src) throw new Error('Image lacks a source URL')
    imageUrls.add(src)
    browserImageSources.set(src, image.attr('src'))
  }))
  const assets = await mapLimit([...imageUrls], 3, async (url, index) => {
    const cached = cachedAssets.get(url)
    if (cached) {
      try {
        const existing = await fs.readFile(path.join(ROOT, 'public', cached.localPath))
        if (hash(existing) === cached.sha256) return completeAsset(cached, existing)
      } catch {}
    }
    // HEIC originals need the already-published browser rendition. Preserve
    // both original and download URLs in the asset provenance.
    let downloadUrl = /\.heic(?:\?|$)/i.test(url) ? browserImageSources.get(url) : url
    let bytes
    try { bytes = await download(downloadUrl) } catch (error) {
      // Some historic Substack storage buckets are private, while the actual
      // image served in the public article remains available from their CDN.
      const publishedRendition = browserImageSources.get(url)
      if (!publishedRendition || publishedRendition === downloadUrl) throw error
      downloadUrl = publishedRendition
      bytes = await download(downloadUrl)
    }
    const sha256 = hash(bytes)
    let extension
    try { extension = imageExtension(bytes) } catch (error) { throw new Error(`${error.message}: ${url} (${bytes.subarray(0, 32).toString('hex')})`) }
    const localPath = `writing/${sha256.slice(0, 24)}.${extension}`
    await fs.writeFile(path.join(ROOT, 'public', localPath), bytes)
    if ((index + 1) % 20 === 0) console.log(`Downloaded ${index + 1}/${imageUrls.size} images`)
    return completeAsset({ sourceUrl: url, downloadUrl, localPath, sha256, bytes: bytes.length }, bytes)
  })
  const assetBySource = new Map(assets.map((asset) => [asset.sourceUrl, asset]))
  const reportPosts = []
  const pending = []
  for (const { post, $, removed } of posts) {
    const beforeText = plainText($.html())
    const beforeImages = $('img').length
    const beforeCaptions = $('figcaption').length
    const beforeEmbeds = $('iframe').length
    $('img').each((_, node) => {
      const image = $(node)
      const original = originalImage(attributeData(image).src || image.attr('src'))
      const asset = assetBySource.get(original)
      image.attr({ src: `/${asset.displayPath}`, width: asset.width, height: asset.height, loading: 'lazy', decoding: 'async' })
      if (image.attr('alt') === 'undefined') image.attr('alt', '')
      image.removeAttr('srcset sizes data-attrs fetchpriority')
      const link = image.closest('a.image-link')
      if (link.length && originalImage(link.attr('href')) === original) link.attr('href', `/${asset.localPath}`)
    })
    $('source').remove()
    $('a[href]').each((_, node) => {
      const link = $(node)
      const href = link.attr('href')
      if (href.startsWith('#') || href.startsWith('/writing/')) return
      let url
      try { url = new URL(href, ORIGIN) } catch { return }
      if (url.origin !== ORIGIN) return
      const match = url.pathname.match(/^\/p\/([^/]+)\/?$/)
      if (match && allSlugs.has(decodeURIComponent(match[1]))) link.attr('href', `/writing/${match[1]}${url.hash}`)
      else if (url.pathname === '/archive') link.attr('href', '/writing')
      else if (url.pathname === '/subscribe') link.attr('href', '/#subscribe')
      else if (url.pathname === '/') link.attr('href', '/')
    })
    const html = sanitize($.html())
    const final = cheerio.load(html, null, false)
    const afterText = plainText(html)
    if (beforeText !== afterText || beforeImages !== final('img').length || beforeCaptions !== final('figcaption').length || beforeEmbeds !== final('iframe').length) {
      throw new Error(`Content parity failed for ${post.slug}`)
    }
    if (final('img').toArray().some((node) => !final(node).attr('src').startsWith('/writing/'))) throw new Error(`Remote image left in ${post.slug}`)
    const wordCount = afterText ? afterText.split(/\s+/).length : 0
    const description = post.subtitle?.trim() || afterText.slice(0, 180)
    const record = {
      slug: post.slug, title: post.title.trim(), subtitle: (post.subtitle || '').trim(),
      description, date: post.post_date, readingMinutes: Math.ceil(wordCount / 220),
      sourceUrl: post.canonical_url, html,
      source: {
        platform: 'Substack', publicationId: post.publication_id, postId: post.id,
        apiUrl: `${ORIGIN}/api/v1/posts/${post.slug}`, originalTitle: post.title,
        originalSubtitle: post.subtitle || '', publishedAt: post.post_date,
        updatedAt: post.updated_at || null, sourceHtmlSha256: hash(post.body_html),
        importedTextSha256: hash(afterText)
      }
    }
    pending.push([path.join(CONTENT, `${post.slug}.json`), JSON.stringify(record, null, 2) + '\n'])
    reportPosts.push({ slug: post.slug, sourceUrl: post.canonical_url, date: post.post_date, sourceWordCount: post.wordcount, preservedWords: wordCount, images: beforeImages, captions: beforeCaptions, embeds: beforeEmbeds, textParity: true, removedPlatformText: removed })
  }
  // Publish the new content only after the whole import passes parity checks.
  for (const [file, contents] of pending) await fs.writeFile(file, contents)
  const report = {
    source: `${ORIGIN}/archive`, importedAt: new Date().toISOString(),
    publishedPosts: archive.length, importedPosts: pending.length,
    dateRange: { first: archive.at(-1).post_date, last: archive[0].post_date },
    restrictedPosts: 0, missingAssets: [], textParityFailures: [],
    uniqueImages: assets.length, imageReferences: reportPosts.reduce((sum, post) => sum + post.images, 0),
    assets, posts: reportPosts
  }
  await fs.writeFile(REPORT, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ importedPosts: pending.length, uniqueImages: assets.length, imageReferences: report.imageReferences, textParityFailures: 0, missingAssets: 0 }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
