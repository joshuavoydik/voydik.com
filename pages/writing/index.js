import Link from 'next/link'
import { useState } from 'react'
import { SiteHeader, SiteFooter } from '../../components/SiteChrome'
import NewsletterSignup from '../../components/NewsletterSignup'
import { getAllWriting } from '../../lib/writing'

export default function Writing({ writing }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase()
  const filtered = query
    ? writing.filter(post => `${post.title} ${post.subtitle || ''} ${post.year}`.toLocaleLowerCase().includes(query))
    : writing
  const years = [...new Set(filtered.map(post => post.year))]

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
          <div className="archive-tools">
            <div className="writing-search">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <label className="visually-hidden" htmlFor="writing-search">Search writing by title or year</label>
              <input id="writing-search" type="search" placeholder="Search writing…" value={search} onChange={event => setSearch(event.target.value)} />
            </div>
            <a className="quiet-link" href="/feed.xml">RSS feed</a>
          </div>
          <p className="search-summary" role="status" aria-live="polite">
            {query ? `${filtered.length} ${filtered.length === 1 ? 'post' : 'posts'} found` : `${writing.length} posts`}
          </p>
          <div className="writing-archive">
            {years.map(year => (
              <section className="archive-year" key={year} aria-labelledby={`year-${year}`}>
                <h2 id={`year-${year}`}>{year}</h2>
                <ul className="writing-list">
                  {filtered.filter(post => post.year === year).map(post => (
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
            {filtered.length === 0 && <p className="empty-search">No writing found. Try another title or year.</p>}
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
    props: {
      writing: await getAllWriting(),
      meta: {
        title: 'Writing — Joshua Voydik',
        description: 'Essays and notes by Joshua Voydik on technology, travel, and figuring things out.'
      }
    }
  }
}
