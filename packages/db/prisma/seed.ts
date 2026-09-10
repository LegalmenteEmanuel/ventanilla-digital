/**
 * Datos de demostración para desarrollo local.
 *
 *   pnpm build && pnpm --filter @vd/db seed
 *
 * Crea una institución, usuarios de cada rol, el trámite "Constancia laboral"
 * con su formulario y su flujo, y varias solicitudes en distintos estados
 * (incluida una aprobada y firmada).
 */
import { createSign, generateKeyPairSync, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { WorkflowEngine, constanciaLaboralWorkflow } from '@vd/core';

import { prisma, Role, RequestStatus, NotificationChannel } from '../src/index.ts';
import { hashPassword } from '../src/password.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const keyDir = resolve(repoRoot, '.keys');
const privKeyPath = resolve(keyDir, 'signing.pem');
const CERT_SUBJECT = 'CN=Ventanilla Digital (DEMO), O=Alcaldia Municipal Demo, C=HN';

function ensureSigningKey(): string {
  if (existsSync(privKeyPath)) return readFileSync(privKeyPath, 'utf8');
  mkdirSync(keyDir, { recursive: true });
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  writeFileSync(privKeyPath, privateKey);
  writeFileSync(resolve(keyDir, 'signing.pub.pem'), publicKey);
  console.log(`  clave de firma generada en ${privKeyPath}`);
  return privateKey;
}

function verificationCode(): string {
  const raw = randomBytes(6).toString('hex').toUpperCase();
  return `VD-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function wipe() {
  // Orden inverso a las dependencias.
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.workflowTransitionLog.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.request.deleteMany();
  await prisma.procedureType.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.institution.deleteMany();
}

async function main() {
  const privateKey = ensureSigningKey();
  await wipe();

  const institution = await prisma.institution.create({
    data: {
      slug: 'alcaldia-demo',
      name: 'Alcaldía Municipal Demo',
      departments: {
        create: [{ name: 'Recursos Humanos' }, { name: 'Secretaría Municipal' }],
      },
    },
    include: { departments: true },
  });
  const rrhh = institution.departments.find((d) => d.name === 'Recursos Humanos')!;

  const pass = await hashPassword('Password123!');
  const mk = (email: string, name: string) =>
    prisma.user.create({ data: { email, name, passwordHash: pass, emailVerified: new Date() } });

  const [superadmin, adminInst, funcionario, revisor, ana, luis] = await Promise.all([
    mk('super@ventanilla.local', 'Super Admin'),
    mk('admin@alcaldia-demo.local', 'Admin Institucional'),
    mk('funcionario@alcaldia-demo.local', 'Funcionario Ventanilla'),
    mk('revisor@alcaldia-demo.local', 'Revisor RRHH'),
    mk('ana@correo.local', 'Ana Torres'),
    mk('luis@correo.local', 'Luis Medina'),
  ]);

  await prisma.membership.createMany({
    data: [
      { userId: superadmin.id, institutionId: institution.id, role: Role.SUPERADMIN },
      { userId: adminInst.id, institutionId: institution.id, role: Role.ADMIN_INSTITUCIONAL },
      {
        userId: funcionario.id,
        institutionId: institution.id,
        departmentId: rrhh.id,
        role: Role.FUNCIONARIO,
      },
      {
        userId: revisor.id,
        institutionId: institution.id,
        departmentId: rrhh.id,
        role: Role.REVISOR,
      },
    ],
  });

  const procedure = await prisma.procedureType.create({
    data: {
      institutionId: institution.id,
      slug: 'constancia-laboral',
      name: 'Constancia laboral',
      description: 'Constancia de relación laboral con la municipalidad.',
      formSchema: {
        type: 'object',
        required: ['nombreCompleto', 'identidad', 'motivo'],
        properties: {
          nombreCompleto: { type: 'string', title: 'Nombre completo' },
          identidad: { type: 'string', title: 'Número de identidad', pattern: '^[0-9]{13}$' },
          cargo: { type: 'string', title: 'Cargo actual' },
          motivo: {
            type: 'string',
            title: 'Motivo',
            enum: ['Trámite bancario', 'Trámite migratorio', 'Uso personal', 'Otro'],
          },
        },
      },
      workflowDefinition: constanciaLaboralWorkflow as object,
    },
  });

  const engine = new WorkflowEngine(constanciaLaboralWorkflow);
  let seq = 0;
  const nextCode = () => `VD-2026-${String(++seq).padStart(6, '0')}`;

  // --- Solicitud 1: recién enviada, en bandeja ---
  await prisma.request.create({
    data: {
      code: nextCode(),
      procedureTypeId: procedure.id,
      citizenId: ana.id,
      currentState: 'enviada',
      status: RequestStatus.EN_PROCESO,
      submittedAt: new Date(),
      dueAt: engine.dueAt({ state: 'enviada', enteredStateAt: new Date() }),
      formData: {
        nombreCompleto: 'Ana Torres',
        identidad: '0801199012345',
        cargo: 'Analista',
        motivo: 'Trámite bancario',
      },
      transitions: {
        create: {
          fromState: 'borrador',
          toState: 'enviada',
          action: 'enviar',
          actorId: ana.id,
          effects: [],
        },
      },
    },
  });

  // --- Solicitud 2: en revisión, SLA vencido ---
  const old = new Date(Date.now() - 5 * 24 * 3600 * 1000);
  await prisma.request.create({
    data: {
      code: nextCode(),
      procedureTypeId: procedure.id,
      citizenId: luis.id,
      currentState: 'en_revision',
      status: RequestStatus.EN_PROCESO,
      submittedAt: old,
      dueAt: engine.dueAt({ state: 'en_revision', enteredStateAt: old }),
      formData: {
        nombreCompleto: 'Luis Medina',
        identidad: '0501198887654',
        cargo: 'Conserje',
        motivo: 'Uso personal',
      },
      transitions: {
        create: [
          {
            fromState: 'borrador',
            toState: 'enviada',
            action: 'enviar',
            actorId: luis.id,
            effects: [],
          },
          {
            fromState: 'enviada',
            toState: 'en_revision',
            action: 'tomar',
            actorId: funcionario.id,
            effects: [],
          },
        ],
      },
    },
  });

  // --- Solicitud 3: aprobada y firmada ---
  const approvedAt = new Date();
  const req3 = await prisma.request.create({
    data: {
      code: nextCode(),
      procedureTypeId: procedure.id,
      citizenId: ana.id,
      currentState: 'aprobada',
      status: RequestStatus.APROBADA,
      submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      closedAt: approvedAt,
      formData: {
        nombreCompleto: 'Ana Torres',
        identidad: '0801199012345',
        cargo: 'Analista',
        motivo: 'Trámite migratorio',
      },
      transitions: {
        create: [
          {
            fromState: 'borrador',
            toState: 'enviada',
            action: 'enviar',
            actorId: ana.id,
            effects: [],
          },
          {
            fromState: 'enviada',
            toState: 'en_revision',
            action: 'tomar',
            actorId: funcionario.id,
            effects: [],
          },
          {
            fromState: 'en_revision',
            toState: 'aprobada',
            action: 'aprobar',
            actorId: revisor.id,
            comment: 'Verificado contra planilla de RRHH.',
            effects: [{ type: 'sign' }, { type: 'generate_pdf' }, { type: 'notify' }],
          },
        ],
      },
    },
  });

  const payload = JSON.stringify({
    code: req3.code,
    procedure: procedure.slug,
    citizen: 'Ana Torres',
    approvedAt: approvedAt.toISOString(),
  });
  const documentHash = createHash('sha256').update(payload).digest('hex');
  const signatureValue = createSign('RSA-SHA256').update(payload).end().sign(privateKey, 'base64');

  await prisma.signature.create({
    data: {
      requestId: req3.id,
      signedById: revisor.id,
      documentHash,
      signatureValue,
      certificateSubject: CERT_SUBJECT,
      verificationCode: verificationCode(),
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: ana.id,
        channel: NotificationChannel.IN_APP,
        subject: 'Tu constancia fue aprobada',
        body: `La solicitud ${req3.code} fue aprobada y firmada.`,
        sentAt: new Date(),
        status: 'ENVIADA',
      },
      {
        userId: luis.id,
        channel: NotificationChannel.IN_APP,
        subject: 'Solicitud en revisión',
        body: 'Un funcionario está revisando tu solicitud.',
        sentAt: new Date(),
        status: 'ENVIADA',
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: revisor.id,
        action: 'request.approved',
        entityType: 'Request',
        entityId: req3.id,
        metadata: { code: req3.code },
      },
      {
        actorId: funcionario.id,
        action: 'request.taken',
        entityType: 'Request',
        entityId: req3.id,
        metadata: { code: req3.code },
      },
    ],
  });

  console.log('Seed completo:');
  console.log('  institución : Alcaldía Municipal Demo');
  console.log(
    '  usuarios    : super@ / admin@ / funcionario@ / revisor@ / ana@ / luis@  (pass: Password123!)',
  );
  console.log('  trámite     : Constancia laboral');
  console.log('  solicitudes : 3 (enviada, en revisión con SLA vencido, aprobada+firmada)');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
