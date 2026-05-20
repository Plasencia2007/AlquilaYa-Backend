import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/landlord/profile/personal', destination: '/landlord/profile', permanent: true },
      { source: '/landlord/profile/docs',     destination: '/landlord/profile', permanent: true },
      { source: '/landlord/profile/security', destination: '/landlord/profile', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
