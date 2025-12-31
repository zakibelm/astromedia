// Prisma Client singleton
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

// Log slow queries in development
prisma.$on('query', (e: any) => {
  if (e.duration > 1000) {
    logger.warn(
      { query: e.query, duration: e.duration, params: e.params },
      'Slow query detected'
    );
  }
});

prisma.$on('error', (e: any) => {
  logger.error({ err: e }, 'Prisma error');
});

prisma.$on('warn', (e: any) => {
  logger.warn({ warning: e }, 'Prisma warning');
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
