import { createHash, createSign, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const KEY_PATH = process.env.SIGNING_PRIVATE_KEY_PATH ?? './.keys/signing.pem';
const CERT_SUBJECT =
  process.env.SIGNING_CERT_SUBJECT ?? 'CN=Ventanilla Digital (DEMO), O=Ventanilla Digital, C=HN';

/** Serialización canónica: claves ordenadas, para que el hash sea reproducible. */
export function canonical(input: Record<string, unknown>): string {
  return JSON.stringify(input, Object.keys(input).sort());
}

let cachedKey: string | undefined;
function privateKey(): string {
  cachedKey ??= readFileSync(KEY_PATH, 'utf8');
  return cachedKey;
}

export interface SignedDoc {
  algorithm: 'RSA-SHA256';
  documentHash: string;
  signatureValue: string;
  certificateSubject: string;
}

export function sign(payload: Record<string, unknown>): SignedDoc {
  const data = canonical(payload);
  return {
    algorithm: 'RSA-SHA256',
    documentHash: createHash('sha256').update(data).digest('hex'),
    signatureValue: createSign('RSA-SHA256').update(data).end().sign(privateKey(), 'base64'),
    certificateSubject: CERT_SUBJECT,
  };
}

/** Código corto para el QR / portal de verificación. */
export function newVerificationCode(): string {
  const raw = randomBytes(6).toString('hex').toUpperCase();
  return `VD-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
