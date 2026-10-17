import Link from 'next/link'
import { getPost, getPostSlugs } from '../../lib/posts'

export default function Post({ post }) {
  return (
    <main className="legacy-page">
      <Link href="/posts">← All posts</Link>
      <article>
        <header>
          <time dateTime={post.date}>{post.displayDate}</time>
          <h1>{post.title}</h1>
        </header>
        <div className="legacy-content" dangerouslySetInnerHTML={{ __html: post.html }} />
        <footer>
          {post.tags.map((tag) => (
            <Link href={`/tags/${encodeURIComponent(tag)}`} key={tag}>{tag}</Link>
          ))}
        </footer>
      </article>
    </main>
  )
}

export function getStaticPaths() {
  return {
    paths: getPostSlugs().map((slug) => ({ params: { slug } })),
    fallback: false
  }
}

export async function getStaticProps({ params }) {
  const post = await getPost(params.slug)
  if (!post) return { notFound: true }
  const { content, ...renderedPost } = post
  return {
    props: {
      post: renderedPost,
      meta: {
        title: `${post.title} — Joshua Voydik`,
        description: post.description
      }
    }
  }
}
