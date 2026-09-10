/** Lee y valida la configuración del worker. Falla rápido si algo falta. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  SMTP_HOST: process.env.SMTP_HOST ?? 'localhost',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 1025),
  SMTP_FROM: process.env.SMTP_FROM ?? 'no-reply@ventanilla.local',
  SIGNING_PRIVATE_KEY_PATH: process.env.SIGNING_PRIVATE_KEY_PATH ?? './.keys/signing.pem',
  SIGNING_CERT_SUBJECT:
    process.env.SIGNING_CERT_SUBJECT ?? 'CN=Ventanilla Digital (DEMO), O=Ventanilla Digital, C=HN',
  STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR ?? './.storage',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
  SLA_SCAN_EVERY_MS: Number(process.env.SLA_SCAN_EVERY_MS ?? 15 * 60_000),
};
