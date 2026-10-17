# voydik.com

Joshua Voydik's personal website, built with Next.js and React.

## Development

Requires Node.js 20.9 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build`, then
`npm start`. The build also regenerates `public/feed.xml`.

## Content

The homepage is in `pages/index.js`. Styles are in `styles/` and public images
are in `public/images/`.

`data/writing.json` is a verified snapshot of posts from Substack; it does not
update automatically. Edit that file to change the homepage writing links.

The original Markdown posts live in `content/posts/`; their existing `/posts/`
and `/tags/` URLs are generated statically. New writing is linked to
[Joshua's Substack](https://joshua.substack.com).

Site metadata lives in `pages/_app.js`. The existing Simple Analytics script
is retained in `pages/_document.js`.
