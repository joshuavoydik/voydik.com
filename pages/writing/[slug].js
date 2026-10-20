import Head from 'next/head'
import Link from 'next/link'
import { Arrow, SiteHeader, SiteFooter } from '../../components/SiteChrome'
import NewsletterSignup from '../../components/NewsletterSignup'
import { getAllWriting, getWritingPost, REVALIDATE_SECONDS } from '../../lib/writing'

export default function Essay({ post }) {
  return (
    <>
      <Head>
        <meta property="article:author" content="Joshua Voydik" />
      </Head>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="personal-site essay-site">
        <SiteHeader compact writingLink />
        <main id="main">
          <article>
            <header className="essay-header">
              <div className="essay-details">
                <time dateTime={post.date}>{post.displayDate}</time>
                {post.readingMinutes > 0 && <><span aria-hidden="true">·</span><span>{post.readingMinutes} min read</span></>}
              </div>
              <h1>{post.title}</h1>
              {post.subtitle && <p className="essay-subtitle">{post.subtitle}</p>}
            </header>
            <div className="essay-body" dangerouslySetInnerHTML={{ __html: post.html }} />
            {post.sourceUrl?.startsWith('https://joshua.substack.com/p/') && (
              <p className="essay-source">
                <a className="archive-link" href={post.sourceUrl}>Read on Substack <Arrow /></a>
              </p>
            )}
          </article>
          <div className="essay-end"><span aria-hidden="true">✳</span><Link className="archive-link" href="/writing">More writing <Arrow /></Link></div>
          <NewsletterSignup />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}

export async function getStaticPaths() {
  const writing = await getAllWriting()
  return { paths: writing.map(post => ({ params: { slug: post.slug } })), fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const post = await getWritingPost(params.slug)
  if (!post) return { notFound: true, revalidate: REVALIDATE_SECONDS }

  return {
    revalidate: REVALIDATE_SECONDS,
    props: {
      post,
      meta: {
        title: `${post.title} — Joshua Voydik`,
        description: post.description || post.subtitle || `${post.title}, by Joshua Voydik.`
      }
    }
  }
}
