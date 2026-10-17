# voydik.com

Joshua Voydik's personal website, built with Next.js and React.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

For a production build, run `npm run build`, then `npm start`. The build also
regenerates the RSS feed and sitemap.

## Writing

- `/` shows the eight most recent posts.
- `/writing` contains the full archive, grouped by year, with title/year search.
- `/writing/[slug]` renders an essay locally, with its original text, date, media,
  captions, and an email signup at the end.
- Imported public posts live in `content/writing/`. Their images are checked into
  `public/writing/`; supported video/audio embeds remain with their original host.
- `data/writing-import.json` records source provenance and import validation.

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

## Newsletter

The shared signup in `components/NewsletterSignup.js` uses Joshua's personal
Buttondown account (`joshuavoydik`). It submits a native HTML POST to the public
form endpoint verified in Buttondown's embedding settings:
`https://buttondown.com/api/emails/embed-subscribe/joshuavoydik`.

Buttondown handles validation and double opt-in confirmation. The form requires
no client-side API key or third-party script. The optional
`NEXT_PUBLIC_NEWSLETTER_URL` environment variable overrides the public form URL;
never put a secret in a `NEXT_PUBLIC_` variable.

The existing Substack subscriber import is pending with the provider. A
production signup must be tested through inbox confirmation and the provider's
subscriber list before migration is considered complete.

Subscriber exports, suppression lists, and credentials must stay outside this
public repository. Import only eligible subscribed contacts as active; preserve
unsubscribed, bounced, and complained states. No broadcast or welcome automation
is enabled by this site.

## Site configuration

Styles are in `styles/`; shared navigation and theme controls are in
`components/SiteChrome.js`. Metadata is in `pages/_app.js`. The existing Simple
Analytics script remains in `pages/_document.js`.
