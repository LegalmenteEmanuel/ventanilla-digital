import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma como singleton. En desarrollo Next.js recarga los módulos en
 * cada cambio; sin este guard se abrirían decenas de pools de conexiones.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
