const { promises: fs } = require('fs')
const path = require('path')
const RSS = require('rss')
const { getAllWriting } = require('../lib/writing')

const SITE_URL = 'https://voydik.com'

async function generate() {
  const feed = new RSS({
    title: 'Joshua Voydik',
    description: 'Founder of Hero and Swell. Writing about technology, travel, and life.',
    site_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.xml`,
    language: 'en'
  })

  const imported = getAllWriting()
  const items = imported.map((post) => ({ ...post, url: `${SITE_URL}/writing/${post.slug}` }))

  items.forEach((post) => {
    feed.item({
      title: post.title,
      url: post.url,
      guid: post.url,
      date: post.date.includes('T') ? post.date : `${post.date}T00:00:00Z`,
      description: post.description,
      categories: post.tags || [],
      author: 'Joshua Voydik'
    })
  })

  await fs.writeFile(path.join(__dirname, '..', 'public', 'feed.xml'), feed.xml({ indent: true }))
  const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character])
  const sitemapUrls = [
    { url: SITE_URL },
    { url: `${SITE_URL}/writing` },
    ...imported.map((post) => ({ url: `${SITE_URL}/writing/${post.slug}`, lastmod: post.lastModified }))
  ]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(({ url, lastmod }) => `  <url><loc>${escapeXml(url)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
  await fs.writeFile(path.join(__dirname, '..', 'public', 'sitemap.xml'), sitemap)
}

generate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
