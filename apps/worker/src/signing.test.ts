import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Clave efímera antes de importar el módulo (lee la ruta al cargar).
const dir = mkdtempSync(join(tmpdir(), 'vd-sign-'));
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
writeFileSync(join(dir, 'signing.pem'), privateKey);
process.env.SIGNING_PRIVATE_KEY_PATH = join(dir, 'signing.pem');

const { canonical, sign, newVerificationCode } = await import('./signing.ts');

test('canonical no depende del orden de las claves', () => {
  assert.equal(canonical({ a: 1, b: 2 }), canonical({ b: 2, a: 1 }));
});

test('sign produce una firma verificable con la clave pública', () => {
  const payload = { code: 'VD-2026-ABCD', approvedAt: '2026-01-01T00:00:00.000Z' };
  const { documentHash, signatureValue, algorithm } = sign(payload);

  assert.equal(algorithm, 'RSA-SHA256');
  assert.match(documentHash, /^[0-9a-f]{64}$/);

  const ok = createVerify('RSA-SHA256')
    .update(canonical(payload))
    .verify(publicKey, signatureValue, 'base64');
  assert.equal(ok, true);
});

test('newVerificationCode tiene el formato VD-XXXX-XXXX-XXXX', () => {
  assert.match(newVerificationCode(), /^VD-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
});
