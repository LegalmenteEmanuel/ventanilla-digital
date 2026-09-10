/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vd/core', '@vd/db', '@vd/jobs'],
  serverExternalPackages: ['@prisma/client', 'bullmq', 'ioredis'],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // bullmq referencia un cliente opcional que no usamos (usamos ioredis).
    config.resolve.alias = { ...config.resolve.alias, '@valkey/valkey-glide': false };
    return config;
  },
};

export default nextConfig;
