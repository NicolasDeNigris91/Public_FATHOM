import type { NextConfig } from 'next';
import path from 'node:path';

// Content-Security-Policy.
// Trade-off: this is a static content site that renders user-authored
// markdown including Mermaid diagrams. Mermaid relies on the Function
// constructor at runtime (requires 'unsafe-eval'), and Tailwind v4 +
// framer-motion inject styles at runtime (requires 'unsafe-inline' for
// styles). The policy below blocks the high-impact attack surface
// (remote scripts, data: scripts, framing the site, mixed content) while
// accepting those two well-scoped relaxations. A nonce-based strict CSP
// would require auditing every inline asset and is tracked as future
// hardening.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  outputFileTracingIncludes: {
    '/**/*': [
      '../../framework/**/*.md',
      '../../README.md',
      '../../MENTOR.md',
      '../../STUDY-PROTOCOL.md',
      '../../PROGRESS.md',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default config;
