# voydik.com

Joshua Voydik's personal website, built with Next.js and React.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

For a production build, run `npm run build`, then `npm start`. Run focused
integration tests with `npm test`.

## Writing

- `/` shows the eight most recent posts.
- `/writing` contains the published archive, grouped by year.
- `/writing/[slug]` renders an essay locally, with its original text, date, media,
  captions, and an email signup at the end.
- Imported public posts live in `content/writing/`. Their images are checked into
  `public/writing/`; supported video/audio embeds remain with their original host.
- `data/writing-import.json` records source provenance and import validation.
- `data/writing-exclusions.json` lists posts removed from the site. Both page
  generation and future imports respect this list.

To refresh the public Substack archive:

```sh
npm run import:writing
npm run build
```

The importer preserves prose, sanitizes HTML, copies image assets, and rewrites
links between imported posts to the local site. It never fetches subscriber
records or drafts. It fails rather than silently publishing a partial import.
Review the content and asset report before committing an import.

The original site's Markdown posts remain in `content/posts/`, with their
existing `/posts/` and `/tags/` URLs. Starter examples are excluded from the new
writing archive and RSS feed.

## Publishing from Substack

Write and publish in the existing `https://joshua.substack.com` publication.
Substack sends the newsletter and manages free and paid subscriptions. The site
reads `https://joshua.substack.com/feed` and combines its public content with the
saved writing archive. Matching posts refresh at their existing URLs without
creating duplicates. New posts appear in Recent writing, `/writing`, essay pages, the feed,
and sitemap without another deploy. Pages refresh on visits after a 60-second
cache interval; the first visit may show the previous version while it refreshes.

Only unauthenticated public feed content is fetched. Paid posts may expose a
preview; every Substack essay has a link to read it on Substack, where access and
payment are handled. The site does not implement a separate paid membership.
The existing exclusion list still applies.

The observed Substack RSS feed contains the latest 20 posts, not the complete
archive. Saved local essays remain available when they are no longer in the feed.
Run `npm run import:writing` and review/deploy the result periodically to save
new public essays before they fall out of the feed. That importer rejects
restricted content; do not use it to copy paid-only posts. Live feed content and
media are a mirror, not an independent backup.

No API key, webhook, subscriber access, or email-sending permission is needed.
Failed feed requests throw during regeneration so existing cached pages survive
an upstream outage. RSS and sitemap are server-rendered and cached separately.

## Newsletter

The shared signup in `components/NewsletterSignup.js` links directly to
`https://joshua.substack.com/subscribe`. Substack handles the email signup,
confirmation, and any paid subscription options in the same publication.

The site does not submit email addresses to an unofficial API and needs no
subscriber credentials or third-party signup script.

Manage subscriber imports and delivery verification privately in Substack.
When changing newsletter providers, reconcile subscribers and suppression states
before sending, and verify the resulting
subscriber status in the provider's dashboard.

Subscriber exports, suppression lists, and credentials must stay outside this
public repository. Import only eligible subscribed contacts as active; preserve
unsubscribed, bounced, and complained states. No broadcast or welcome automation
is enabled by this site.

## Site configuration

Styles are in `styles/`; shared navigation and theme controls are in
`components/SiteChrome.js`. Metadata is in `pages/_app.js`. The existing Simple
Analytics script remains in `pages/_document.js`.
