import Head from 'next/head'
import { useEffect, useState } from 'react'
import writing from '../data/writing.json'

function Arrow({ diagonal = false }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ThemeToggle() {
  const [theme, setTheme] = useState('light')
  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'light') }, [])
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try { localStorage.setItem('voydik-theme', next) } catch {}
  }
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      <svg className="moon-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5 8.5 8.5 0 1 0 20.5 13.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <svg className="sun-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
  )
}

const projects = [
  { name: 'Hero', description: 'AI tools for selling your stuff.', role: 'Co-founder & CEO', status: 'Now', url: 'https://www.herostuff.com/', image: '/images/hero.png' },
  { name: 'Swell', description: 'Flexible infrastructure for modern commerce.', role: 'Co-founder', status: 'Previously', url: 'https://www.swell.is/', image: '/images/swell.png' }
]

export default function Home() {
  return (
    <>
      <Head><title>Joshua Voydik</title></Head>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="personal-site">
        <header className="site-header">
          <img className="portrait" src="/images/joshua.jpg" alt="Joshua Voydik" width="56" height="56" />
          <ThemeToggle />
        </header>
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
            <div className="section-heading"><h2 id="writing-title">Writing</h2><a className="quiet-link" href="https://joshua.substack.com/">Substack <Arrow diagonal /></a></div>
            <p className="section-description">Notes on technology, travel, and figuring things out.</p>
            <ul className="writing-list">
              {writing.map(post => (
                <li key={post.url}><a className="writing-link" href={post.url}>
                  <span className="writing-title">{post.title.trim()}</span>
                  <time dateTime={post.date}>{new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.date))}</time>
                </a></li>
              ))}
            </ul>
            <a className="archive-link" href="https://joshua.substack.com/archive">All writing <Arrow /></a>
          </section>
        </main>
        <footer className="site-footer">
          <a className="email-link" href="mailto:voydik@gmail.com">Say hello <Arrow diagonal /></a>
          <nav aria-label="Find me elsewhere"><a href="https://www.linkedin.com/in/joshuavoydik/">LinkedIn</a><a href="https://x.com/joshuavoydik">X</a><a href="https://github.com/joshuavoydik">GitHub</a></nav>
        </footer>
      </div>
    </>
  )
}
