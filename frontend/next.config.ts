import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { createMDX } from 'fumadocs-mdx/next';

if (process.env.NODE_ENV === 'development' && !process.env.SERVICE_API_URL_BASE) {
  console.error(
    '\x1b[31m%s\x1b[0m',
    'SERVICE_API_URL_BASE environment variable is required for development\n' +
      '\x1b[33mTip: You can create .env file by copying .env.example:\x1b[0m\n' +
      '\x1b[36mcp .env.example .env\x1b[0m'
  );
  process.exit(1);
}

const withNextIntl = createNextIntlPlugin('./src/i18n/index.ts');
const withMDX = createMDX();

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    unoptimized: true
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/rag/document/image/:path*',
          destination: `${process.env.SERVICE_API_URL_BASE}/rag/document/image/:path*`
        }
      ];
    }
    return [];
  }
};

export default withNextIntl(withMDX(nextConfig));
