import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { env } from './env.ts';

/**
 * Almacenamiento de documentos. Driver `local`: escribe bajo `STORAGE_LOCAL_DIR`.
 * `apps/web` lee del mismo directorio para servir los PDF.
 *
 * ponytail: sólo driver local; añadir S3 cuando haya despliegue real.
 */
function pathFor(key: string): string {
  return resolve(env.STORAGE_LOCAL_DIR, key);
}

export async function save(key: string, data: Buffer): Promise<string> {
  const full = pathFor(key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function load(key: string): Promise<Buffer> {
  return readFile(pathFor(key));
}
