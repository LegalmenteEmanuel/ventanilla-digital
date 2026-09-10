import { existsSync } from 'node:fs';

// El .env vive en la raíz del monorepo; Next sólo mira su propia carpeta.
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vd/core', '@vd/db', '@vd/jobs'],
  serverExternalPackages: ['@prisma/client', 'bullmq', 'ioredis'],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // bullmq arrastra un cliente opcional (valkey) y un `require` dinámico para
    // procesadores en sandbox que no usamos. Ninguno afecta al runtime.
    config.resolve.alias = { ...config.resolve.alias, '@valkey/valkey-glide': false };
    config.ignoreWarnings = [...(config.ignoreWarnings ?? []), { module: /bullmq/ }];
    return config;
  },
};

export default nextConfig;
