import { getAllWriting } from '../lib/writing'
import { renderFeed } from '../lib/syndication'

export async function getServerSideProps({ res }) {
  const posts = await getAllWriting()
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.end(renderFeed(posts))
  return { props: {} }
}

export default function Feed() { return null }
