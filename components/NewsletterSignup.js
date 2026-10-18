import { useId } from 'react'
import { Arrow } from './SiteChrome'

export default function NewsletterSignup() {
  const id = useId()
  const endpoint = process.env.NEXT_PUBLIC_NEWSLETTER_URL || 'https://buttondown.com/api/emails/embed-subscribe/joshuavoydik'

  return (
    <section id="subscribe" className="newsletter" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Get new writing by email.</h2>
      <p>Notes on travel, technology, and life.<br className="desktop-break" /> Sent when I have something to share.</p>
      <form className="newsletter-form" action={endpoint} method="post" target="_blank" rel="noopener noreferrer">
        <label className="visually-hidden" htmlFor={`${id}-email`}>Your email address</label>
        <input id={`${id}-email`} type="email" name="email" placeholder="Your email address" autoComplete="email" required />
        <input type="hidden" name="embed" value="1" />
        <button type="submit">Subscribe <Arrow /></button>
      </form>
      <p className="newsletter-note">Unsubscribe anytime.</p>
    </section>
  )
}
