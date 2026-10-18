import Link from 'next/link'
import { Arrow, SiteHeader, SiteFooter } from '../components/SiteChrome'
import NewsletterSignup from '../components/NewsletterSignup'
import { getAllWriting, REVALIDATE_SECONDS } from '../lib/writing'

const projects = [
  { name: 'Hero', description: 'AI tools for selling your stuff.', role: 'Co-founder & CEO', status: 'Now', url: 'https://www.herostuff.com/', image: '/images/hero.png' },
  { name: 'Swell', description: 'Flexible infrastructure for modern commerce.', role: 'Co-founder', status: 'Previously', url: 'https://www.swell.is/', image: '/images/swell.png' }
]

export default function Home({ writing }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="personal-site">
        <SiteHeader />
        <main id="main">
          <section className="intro" aria-labelledby="intro-title">
            <h1 id="intro-title">Joshua Voydik</h1>
            <p>I build companies and follow my curiosity.<br className="desktop-break" /> Currently building <a href="https://www.herostuff.com/">Hero</a>. Previously, <a href="https://www.swell.is/">Swell</a>.</p>
          </section>
          <section className="projects-section" aria-labelledby="projects-title">
            <h2 id="projects-title">Companies</h2>
            <div className="project-list">
              {projects.map(project => (
                <a className="project" href={project.url} key={project.name}>
                  <span className="project-icon"><img src={project.image} alt="" width="44" height="44" /></span>
                  <span className="project-copy">
                    <span className="project-heading"><span className="project-name">{project.name}</span><span className="project-status">{project.status}</span></span>
                    <span className="project-description">{project.description}</span>
                    <span className="project-role">{project.role}</span>
                  </span>
                  <span className="project-arrow"><Arrow diagonal /></span>
                </a>
              ))}
            </div>
          </section>
          <section className="writing-section" aria-labelledby="writing-title">
            <h2 id="writing-title">Recent writing</h2>
            <p className="section-description">Notes on technology, travel, and figuring things out.</p>
            <ul className="writing-list">
              {writing.map(post => (
                <li key={post.slug}><Link className="writing-link" href={`/writing/${post.slug}`}>
                  <span className="writing-title">{post.title.trim()}</span>
                  <time dateTime={post.date}>{new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(post.date))}</time>
                </Link></li>
              ))}
            </ul>
            <Link className="archive-link" href="/writing">More writing <Arrow /></Link>
          </section>
          <NewsletterSignup />
        </main>
        <SiteFooter />
      </div>
    </>
  )
}

export async function getStaticProps() {
  const writing = await getAllWriting()
  return { props: { writing: writing.slice(0, 8) }, revalidate: REVALIDATE_SECONDS }
}
