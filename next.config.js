/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  agentRules: false,
  // Bundle the sanitizer's ESM parser dependency for the serverless runtime.
  transpilePackages: ['sanitize-html'],
  turbopack: {
    root: __dirname
  }
}
