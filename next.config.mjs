/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  // If TS ever blocks the build, uncomment the next line:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
