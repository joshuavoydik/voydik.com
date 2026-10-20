const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const cheerio = require('cheerio')
const { fetchSubstackPosts } = require('./substack')
const excludedSlugs = new Set(require('../data/writing-exclusions.json'))

const writingDirectory = path.join(process.cwd(), 'content', 'writing')
const REVALIDATE_SECONDS = 60
let feedRequest
let feedFetchedAt = 0

function getWritingSlugs() {
  if (!fs.existsSync(writingDirectory)) return []
  return fs.readdirSync(writingDirectory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5))
    .filter((slug) => !excludedSlugs.has(slug))
}

function getLocalWritingPost(slug) {
  if (!getWritingSlugs().includes(slug)) return null
  const post = JSON.parse(fs.readFileSync(path.join(writingDirectory, `${slug}.json`), 'utf8'))
  return {
    ...post,
    lastModified: post.source?.updatedAt || post.date,
    displayDate: new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles'
    }).format(new Date(post.date)),
    year: new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(post.date))
  }
}

// Coalesce simultaneous page regeneration requests without keeping stale content
// indefinitely. Errors propagate so Next retains the last successful ISR page.
function getSubstackPosts() {
  if (!feedRequest || Date.now() - feedFetchedAt >= 30_000) {
    feedFetchedAt = Date.now()
    feedRequest = fetchSubstackPosts().catch((error) => {
      feedRequest = undefined
      throw error
    })
  }
  return feedRequest
}

function mergeWriting(localPosts, substackPosts) {
  const posts = new Map(localPosts.filter(post => !excludedSlugs.has(post.slug)).map(post => [post.slug, post]))
  const sourceKey = (url) => {
    try {
      const parsed = new URL(url)
      return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`
    } catch { return null }
  }
  const existingSources = new Map([...posts.values()].flatMap(post => {
    const key = sourceKey(post.sourceUrl)
    return key ? [[key, post.slug]] : []
  }))
  const imported = substackPosts.filter(post => !excludedSlugs.has(post.slug)).map(post => {
    // The RSS feed overlaps the saved Substack archive. Refresh the same post
    // at its existing URL instead of creating a duplicate with a hashed slug.
    const existingSlug = existingSources.get(sourceKey(post.sourceUrl))
    if (existingSlug) {
      const previous = posts.get(existingSlug)
      const published = { ...previous, ...post, slug: existingSlug, subtitle: post.subtitle || previous.subtitle || '' }
      posts.set(existingSlug, published)
      return published
    }
    let slug = post.slug
    if (posts.has(slug)) {
      const suffix = crypto.createHash('sha256').update(post.source.postId).digest('hex').slice(0, 8)
      slug = `${slug}-${suffix}`
    }
    if (posts.has(slug)) throw new Error('Conflicting writing slugs')
    const published = { ...post, slug }
    posts.set(slug, published)
    return published
  })
  const localUrls = new Map([...posts.values()].flatMap(post => {
    const key = sourceKey(post.sourceUrl)
    return key ? [[key, `/writing/${post.slug}`]] : []
  }))
  for (const post of imported) {
    const $ = cheerio.load(post.html, null, false)
    $('a[href]').each((_, node) => {
      try {
        const url = new URL($(node).attr('href'), post.sourceUrl)
        const local = localUrls.get(`${url.origin}${url.pathname}`.replace(/\/$/, ''))
        if (local) $(node).attr('href', `${local}${url.hash}`)
      } catch {}
    })
    post.html = $.html()
  }
  return [...posts.values()].sort((a, b) => b.date.localeCompare(a.date))
}

async function getFullWriting() {
  return mergeWriting(getWritingSlugs().map(getLocalWritingPost), await getSubstackPosts())
}

async function getWritingPost(slug) {
  if (excludedSlugs.has(slug)) return null
  return (await getFullWriting()).find(post => post.slug === slug) || null
}

async function getAllWriting() {
  return (await getFullWriting()).map(({ html, source, ...post }) => post)
}

module.exports = { getAllWriting, getWritingPost, getWritingSlugs, getLocalWritingPost, mergeWriting, REVALIDATE_SECONDS }
