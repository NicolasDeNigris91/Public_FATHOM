import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  experimental: {
    typedRoutes: false,
  },
};

export default config;
