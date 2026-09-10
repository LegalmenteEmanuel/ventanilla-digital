import { prisma } from '@vd/db';

import { env } from './env.ts';
import { renderConstancia } from './pdf.ts';
import { sendMail } from './mailer.ts';
import { sign, newVerificationCode } from './signing.ts';
import * as storage from './storage.ts';
import { render as renderTemplate } from './templates.ts';

interface EffectRecord {
  type: string;
  params?: Record<string, unknown>;
}

type LoadedLog = NonNullable<Awaited<ReturnType<typeof loadLog>>>;

function loadLog(transitionLogId: string) {
  return prisma.workflowTransitionLog.findUnique({
    where: { id: transitionLogId },
    include: {
      request: {
        include: {
          citizen: true,
          procedureType: { include: { institution: true } },
          signature: true,
        },
      },
    },
  });
}

/** Procesa, en orden, los efectos declarativos de una transición. */
export async function processTransition(transitionLogId: string): Promise<void> {
  const log = await loadLog(transitionLogId);
  if (!log) {
    console.warn(`[effects] transición ${transitionLogId} no encontrada`);
    return;
  }
  const effects = (Array.isArray(log.effects) ? log.effects : []) as unknown as EffectRecord[];
  for (const effect of effects) {
    await runEffect(effect, log);
  }
}

async function runEffect(effect: EffectRecord, log: LoadedLog): Promise<void> {
  switch (effect.type) {
    case 'sign':
      return doSign(log);
    case 'generate_pdf':
      return doGeneratePdf(log);
    case 'notify':
      return doNotify(effect, log);
    default:
      console.warn(`[effects] efecto no soportado: ${effect.type}`);
  }
}

async function doSign(log: LoadedLog): Promise<void> {
  const { request } = log;
  if (request.signature) return; // idempotente

  const signed = sign({
    code: request.code,
    procedure: request.procedureType.slug,
    citizen: request.citizen.name ?? request.citizen.email,
    approvedAt: log.createdAt.toISOString(),
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.signature.create({
        data: {
          requestId: request.id,
          signedById: log.actorId,
          algorithm: signed.algorithm,
          documentHash: signed.documentHash,
          signatureValue: signed.signatureValue,
          certificateSubject: signed.certificateSubject,
          verificationCode: newVerificationCode(),
        },
      });
      console.log(`[effects] firmada ${request.code}`);
      return;
    } catch (err: unknown) {
      if (isUniqueViolation(err) && attempt < 2) continue; // colisión de verificationCode
      throw err;
    }
  }
}

async function doGeneratePdf(log: LoadedLog): Promise<void> {
  const { request } = log;
  const signature = await prisma.signature.findUnique({ where: { requestId: request.id } });
  if (!signature) {
    console.warn(`[effects] ${request.code}: no hay firma, se omite el PDF`);
    return;
  }

  const verifyUrl = `${env.PUBLIC_BASE_URL}/verificar/${signature.verificationCode}`;
  const pdf = await renderConstancia({
    code: request.code,
    institution: request.procedureType.institution.name,
    procedureName: request.procedureType.name,
    citizenName: request.citizen.name ?? request.citizen.email,
    formData: request.formData as Record<string, unknown>,
    issuedAt: signature.createdAt,
    verificationCode: signature.verificationCode,
    verifyUrl,
    documentHash: signature.documentHash,
  });

  const key = `constancias/${request.code}.pdf`;
  await storage.save(key, pdf);
  await prisma.signature.update({ where: { id: signature.id }, data: { pdfStorageKey: key } });
  console.log(`[effects] PDF generado ${key}`);
}

async function doNotify(effect: EffectRecord, log: LoadedLog): Promise<void> {
  const { request } = log;
  const recipient = effect.params?.to === 'citizen' ? request.citizen : null;
  if (!recipient) return;

  const { subject, body } = renderTemplate(String(effect.params?.template ?? ''), {
    code: request.code,
    procedure: request.procedureType.name,
    comment: log.comment,
  });

  await prisma.notification.create({
    data: {
      userId: recipient.id,
      channel: 'IN_APP',
      subject,
      body,
      status: 'ENVIADA',
      sentAt: new Date(),
    },
  });

  try {
    await sendMail({ to: recipient.email, subject, text: body });
    console.log(`[effects] notificado ${recipient.email}: ${subject}`);
  } catch (err) {
    await prisma.notification.create({
      data: { userId: recipient.id, channel: 'EMAIL', subject, body, status: 'FALLIDA' },
    });
    console.error(`[effects] fallo al enviar correo a ${recipient.email}:`, err);
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
