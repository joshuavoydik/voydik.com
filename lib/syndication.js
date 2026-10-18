const RSS = require('rss')
const SITE_URL = 'https://voydik.com'

function renderFeed(posts) {
  const feed = new RSS({
    title: 'Joshua Voydik',
    description: 'Founder of Hero and Swell. Writing about technology, travel, and life.',
    site_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.xml`,
    language: 'en'
  })
  for (const post of posts) {
    const url = `${SITE_URL}/writing/${post.slug}`
    feed.item({ title: post.title, url, guid: url, date: post.date, description: post.description, categories: post.tags || [], author: 'Joshua Voydik' })
  }
  return feed.xml({ indent: true })
}

function renderSitemap(posts) {
  const escapeXml = value => String(value).replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character])
  const urls = [
    { url: SITE_URL },
    { url: `${SITE_URL}/writing` },
    ...posts.map(post => ({ url: `${SITE_URL}/writing/${post.slug}`, lastmod: post.lastModified }))
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ url, lastmod }) => `  <url><loc>${escapeXml(url)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
}

module.exports = { renderFeed, renderSitemap }
