import Link from 'next/link'
import { getAllPosts } from '../../lib/posts'

export default function TaggedPosts({ tag, posts }) {
  return (
    <main className="legacy-page">
      <Link href="/posts">← All posts</Link>
      <header><h1>Posts tagged “{tag}”</h1></header>
      <div className="legacy-content">
        {posts.map((post) => (
          <article key={post.slug}>
            <time dateTime={post.date}>{post.displayDate}</time>
            <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
            <p>{post.description}</p>
          </article>
        ))}
      </div>
    </main>
  )
}

export function getStaticPaths() {
  const tags = [...new Set(getAllPosts().flatMap((post) => post.tags))]
  return { paths: tags.map((tag) => ({ params: { tag } })), fallback: false }
}

export function getStaticProps({ params }) {
  const posts = getAllPosts().filter((post) => post.tags.includes(params.tag))
  if (!posts.length) return { notFound: true }
  return {
    props: {
      tag: params.tag,
      posts,
      meta: { title: `${params.tag} — Joshua Voydik` }
    }
  }
}
