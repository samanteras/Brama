import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The embed page is meant to be framed by customers, so it must not
        // carry the framing restrictions that protect the rest of the app.
        //
        // `frame-ancestors *` looks permissive, and it is: any site can display
        // the frame. It cannot get answers out of it, though — the chat and lead
        // endpoints check Origin against the bot's allowed domains, so an
        // unauthorised embed shows a chat window that politely refuses. Pinning
        // this header per bot would need the allow-list at header time, before
        // we know which bot is being requested.
        source: '/embed/:path*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
      {
        // Served to third-party sites, so it needs to be fetchable from
        // anywhere and cached for a sensible time.
        source: '/widget.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=600, s-maxage=3600' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        // Everything else refuses to be framed at all. The dashboard inside an
        // attacker's iframe is a clickjacking setup.
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
