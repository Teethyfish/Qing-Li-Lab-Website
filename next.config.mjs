import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  // If TS ever blocks the build, uncomment the next line:
  // typescript: { ignoreBuildErrors: true },
};

export default withNextIntl(nextConfig);
