import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Contrato de colas compartido entre `apps/web` (productor) y `apps/worker`
 * (consumidor). Redis es el backend (BullMQ).
 */

// BullMQ 5 no permite ':' en el nombre de la cola.
export const QUEUE_EFFECTS = 'vd-effects';
export const QUEUE_SLA = 'vd-sla';

/**
 * Raíz del monorepo. `apps/web` y `apps/worker` corren con CWD distinto (su
 * propia carpeta), así que las rutas de `.env` (claves, almacén de PDF) deben
 * anclarse aquí para que ambos procesos apunten al mismo sitio.
 */
export function repoRoot(from = process.cwd()): string {
  let dir = from;
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return from;
}

/** Resuelve una ruta contra la raíz del monorepo (deja intactas las absolutas). */
export function fromRoot(p: string): string {
  return resolve(repoRoot(), p);
}

/** Procesar los efectos declarativos de una transición ya persistida. */
export interface ProcessEffectsJob {
  transitionLogId: string;
}

let connection: Redis | undefined;

/** Conexión Redis singleton (BullMQ exige `maxRetriesPerRequest: null`). */
export function redisConnection(): Redis {
  connection ??= new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  return connection;
}

let effectsQueue: Queue<ProcessEffectsJob> | undefined;

export function getEffectsQueue(): Queue<ProcessEffectsJob> {
  effectsQueue ??= new Queue<ProcessEffectsJob>(QUEUE_EFFECTS, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    },
  });
  return effectsQueue;
}

let slaQueue: Queue | undefined;

export function getSlaQueue(): Queue {
  slaQueue ??= new Queue(QUEUE_SLA, { connection: redisConnection() });
  return slaQueue;
}

/** Encola el procesamiento de los efectos de una transición. */
export async function enqueueEffects(transitionLogId: string): Promise<void> {
  await getEffectsQueue().add('process-effects', { transitionLogId });
}

/** Programa (idempotente) el barrido periódico de SLA vencidos. */
export async function scheduleSlaScan(everyMs = 15 * 60_000): Promise<void> {
  await getSlaQueue().upsertJobScheduler('sla-scan', { every: everyMs }, { name: 'scan' });
}
