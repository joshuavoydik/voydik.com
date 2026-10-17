import Head from 'next/head'
import { useRouter } from 'next/router'

import '../styles/main.css'
import '../styles/global.css'

const SITE_URL = 'https://voydik.com'
const DESCRIPTION = 'Founder of Hero and Swell. Writing about technology, travel, and life.'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const title = pageProps.meta?.title || 'Joshua Voydik'
  const description = pageProps.meta?.description || DESCRIPTION
  const canonical = `${SITE_URL}${router.asPath.split(/[?#]/)[0]}`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} key="description" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} key="canonical" />
        <meta property="og:site_name" content="Joshua Voydik" />
        <meta property="og:type" content={pageProps.post ? 'article' : 'website'} />
        <meta property="og:title" content={title} key="og:title" />
        <meta property="og:description" content={description} key="og:description" />
        <meta property="og:url" content={canonical} key="og:url" />
        <meta property="og:image" content={`${SITE_URL}/images/joshua.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} key="twitter:title" />
        <meta name="twitter:description" content={description} key="twitter:description" />
        <meta name="twitter:image" content={`${SITE_URL}/images/joshua.jpg`} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Joshua Voydik — RSS"
          href={`${SITE_URL}/feed.xml`}
        />
        <link
          rel="preload"
          href="/fonts/Inter-roman.latin.var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
