const fs = require('fs')
const path = require('path')
const excludedSlugs = new Set(require('../data/writing-exclusions.json'))

const writingDirectory = path.join(process.cwd(), 'content', 'writing')

function getWritingSlugs() {
  if (!fs.existsSync(writingDirectory)) return []
  return fs.readdirSync(writingDirectory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5))
    .filter((slug) => !excludedSlugs.has(slug))
}

function getWritingPost(slug) {
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

function getAllWriting() {
  return getWritingSlugs().map((slug) => {
    const { html, source, ...post } = getWritingPost(slug)
    return post
  }).sort((a, b) => b.date.localeCompare(a.date))
}

module.exports = { getAllWriting, getWritingPost, getWritingSlugs }
