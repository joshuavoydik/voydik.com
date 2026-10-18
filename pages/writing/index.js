import Link from 'next/link'
import { SiteHeader, SiteFooter } from '../../components/SiteChrome'
import NewsletterSignup from '../../components/NewsletterSignup'
import { getAllWriting, REVALIDATE_SECONDS } from '../../lib/writing'

export default function Writing({ writing }) {
  const years = [...new Set(writing.map(post => post.year))]

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="personal-site archive-site">
        <SiteHeader compact />
        <main id="main">
          <div className="archive-intro">
            <h1>Writing</h1>
            <p>Notes on technology, travel, and figuring things out.</p>
          </div>
          <p className="archive-count">{writing.length} posts</p>
          <div className="writing-archive">
            {years.map(year => (
              <section className="archive-year" key={year} aria-labelledby={`year-${year}`}>
                <h2 id={`year-${year}`}>{year}</h2>
                <ul className="writing-list">
                  {writing.filter(post => post.year === year).map(post => (
                    <li key={post.slug}>
                      <Link className="writing-link" href={`/writing/${post.slug}`}>
                        <span className="writing-title">{post.title.trim()}</span>
                        <time dateTime={post.date}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(post.date))}</time>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <NewsletterSignup />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}

export async function getStaticProps() {
  return {
    revalidate: REVALIDATE_SECONDS,
    props: {
      writing: await getAllWriting(),
      meta: {
        title: 'Writing — Joshua Voydik',
        description: 'Essays and notes by Joshua Voydik on technology, travel, and figuring things out.'
      }
    }
  }
}
