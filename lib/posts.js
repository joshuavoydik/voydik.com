const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const postsDirectory = path.join(process.cwd(), 'content', 'posts')

function getPostSlugs() {
  return fs.readdirSync(postsDirectory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.slice(0, -3))
}

function readPost(slug) {
  // Only resolve files from the known local collection.
  if (!getPostSlugs().includes(slug)) return null

  const source = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), 'utf8')
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!frontmatter) throw new Error(`Missing frontmatter in ${slug}.md`)
  const data = YAML.parse(frontmatter[1])
  const content = frontmatter[2]
  const date = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : String(data.date).split(/[/-]/).map((part) => part.padStart(2, '0')).join('-')

  return {
    slug,
    title: data.title,
    description: data.description || '',
    date,
    displayDate: new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${date}T00:00:00Z`)),
    tags: String(data.tag || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    content
  }
}

function getAllPosts() {
  return getPostSlugs().map((slug) => {
    const { content, ...post } = readPost(slug)
    return post
  }).sort((a, b) => b.date.localeCompare(a.date))
}

async function getPost(slug) {
  const post = readPost(slug)
  if (!post) return null
  const [{ Marked }, { default: markedFootnote }, { gfmHeadingId }] = await Promise.all([
    import('marked'),
    import('marked-footnote'),
    import('marked-gfm-heading-id')
  ])
  const markdown = new Marked(gfmHeadingId(), markedFootnote())
  return { ...post, html: await markdown.parse(post.content) }
}

module.exports = { getAllPosts, getPost, getPostSlugs }
