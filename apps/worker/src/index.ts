import { Worker } from 'bullmq';

import { prisma } from '@vd/db';
import {
  QUEUE_EFFECTS,
  QUEUE_SLA,
  redisConnection,
  scheduleSlaScan,
  type ProcessEffectsJob,
} from '@vd/jobs';

import { env } from './env.ts';
import { processTransition } from './effects.ts';
import { scanSla } from './sla.ts';

console.log('[worker] arrancando · redis:', env.REDIS_URL);

const effectsWorker = new Worker<ProcessEffectsJob>(
  QUEUE_EFFECTS,
  async (job) => {
    console.log(`[worker] efectos de transición ${job.data.transitionLogId}`);
    await processTransition(job.data.transitionLogId);
  },
  { connection: redisConnection(), concurrency: 4 },
);

const slaWorker = new Worker(
  QUEUE_SLA,
  async () => {
    await scanSla();
  },
  { connection: redisConnection() },
);

for (const w of [effectsWorker, slaWorker]) {
  w.on('failed', (job, err) => console.error(`[worker] job ${job?.id} falló:`, err.message));
}

await scheduleSlaScan(env.SLA_SCAN_EVERY_MS);
console.log(
  `[worker] listo · barrido de SLA cada ${Math.round(env.SLA_SCAN_EVERY_MS / 60_000)} min`,
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal}, cerrando…`);
  await Promise.allSettled([effectsWorker.close(), slaWorker.close()]);
  await prisma.$disconnect();
  await redisConnection().quit();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
