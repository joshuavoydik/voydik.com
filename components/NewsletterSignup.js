import { useId } from 'react'
import { Arrow } from './SiteChrome'

export default function NewsletterSignup() {
  const id = useId()

  return (
    <section id="subscribe" className="newsletter" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Get new writing by email.</h2>
      <p>Notes on travel, technology, and life.<br className="desktop-break" /> Sent when I have something to share.</p>
      <a className="newsletter-fallback" href="https://joshua.substack.com/subscribe">
        Subscribe on Substack <Arrow />
      </a>
      <p className="newsletter-note">Unsubscribe anytime.</p>
    </section>
  )
}
