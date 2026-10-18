import Link from 'next/link'
import { useEffect, useState } from 'react'

export function Arrow({ diagonal = false }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'light')
  }, [])

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

export function SiteHeader({ compact = false, writingLink = false }) {
  return (
    <header className={`site-header${compact ? ' compact-header' : ''}`}>
      {compact ? (
        <Link className="site-identity" href="/">
          <img className="portrait" src="/images/joshua.jpg" alt="" width="36" height="36" />
          <span>Joshua Voydik</span>
        </Link>
      ) : <img className="portrait" src="/images/joshua.jpg" alt="Joshua Voydik" width="56" height="56" />}
      <div className="header-actions">
        {writingLink && <Link className="header-writing-link" href="/writing">All writing</Link>}
        <ThemeToggle />
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="email-link" href="mailto:voydik@gmail.com">Say hello <Arrow diagonal /></a>
      <nav aria-label="Find me elsewhere">
        <a href="https://www.linkedin.com/in/joshuavoydik/">LinkedIn</a>
        <a href="https://x.com/joshuavoydik">X</a>
      </nav>
    </footer>
  )
}
