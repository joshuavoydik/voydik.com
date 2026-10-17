const { promises: fs } = require('fs')
const path = require('path')
const RSS = require('rss')
const { getAllPosts } = require('../lib/posts')

const SITE_URL = 'https://voydik.com'

async function generate() {
  const feed = new RSS({
    title: 'Joshua Voydik',
    description: 'Founder of Hero and Swell. Writing about technology, travel, and life.',
    site_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.xml`,
    language: 'en'
  })

  getAllPosts().forEach((post) => {
    feed.item({
      title: post.title,
      url: `${SITE_URL}/posts/${post.slug}`,
      guid: `${SITE_URL}/posts/${post.slug}`,
      date: `${post.date}T00:00:00Z`,
      description: post.description,
      categories: post.tags,
      author: 'Joshua Voydik'
    })
  })

  await fs.writeFile(path.join(__dirname, '..', 'public', 'feed.xml'), feed.xml({ indent: true }))
}

generate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
