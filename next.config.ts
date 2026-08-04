import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The embed page is meant to be framed by customers, so it must not
        // carry the blanket framing ban that protects the rest of the app.
        //
        // The real directive is set per bot in proxy.ts, from that bot's own
        // allowed domains — a static header here cannot do it, because which
        // bot is being requested is only known at request time. This entry
        // exists so the catch-all X-Frame-Options rule below does not apply.
        source: '/embed/:path*',
        headers: [{ key: 'X-Frame-Options', value: '' }],
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
