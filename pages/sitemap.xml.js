import { getAllWriting } from '../lib/writing'
import { renderSitemap } from '../lib/syndication'

export async function getServerSideProps({ res }) {
  const posts = await getAllWriting()
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.end(renderSitemap(posts))
  return { props: {} }
}

export default function Sitemap() { return null }
