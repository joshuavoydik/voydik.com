import Link from 'next/link'
import { getAllPosts } from '../../lib/posts'

export default function Posts({ posts }) {
  return (
    <main className="legacy-page">
      <Link href="/">← Joshua Voydik</Link>
      <header>
        <h1>Posts</h1>
        <p>From the archive. New writing is on <a href="https://joshua.substack.com">Substack</a>.</p>
      </header>
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

export function getStaticProps() {
  return {
    props: {
      posts: getAllPosts(),
      meta: { title: 'Posts — Joshua Voydik' }
    }
  }
}
