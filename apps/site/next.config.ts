import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  output: 'standalone',
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
  poweredByHeader: false,
};

export default config;
