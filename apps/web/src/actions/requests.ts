'use server';

import { randomBytes } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { WorkflowEngine, type WorkflowDefinition } from '@vd/core';
import { prisma, Prisma, RequestStatus } from '@vd/db';
import { enqueueEffects } from '@vd/jobs';

import { getRequestByCode } from '@/lib/data';
import { effectiveRoles, requireSession } from '@/lib/rbac';
import { coerce, validate, type JsonSchema } from '@/lib/schema';

export type RequestActionState = { ok: true } | { error: string; fieldErrors?: string[] } | null;

function genCode(): string {
  return `VD-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Best-effort: si Redis no está disponible, no bloquea la operación del usuario. */
async function tryEnqueue(transitionLogId: string, hasEffects: boolean): Promise<void> {
  if (!hasEffects) return;
  try {
    await enqueueEffects(transitionLogId);
  } catch (err) {
    console.error('[requests] no se pudo encolar efectos:', err);
  }
}

export async function createRequestAction(
  slug: string,
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const session = await requireSession();
  const uid = session.user.id;

  const proc = await prisma.procedureType.findFirst({ where: { slug, active: true } });
  if (!proc) return { error: 'Este trámite no está disponible.' };

  const data = coerce(proc.formSchema as JsonSchema, formData);
  const v = validate(proc.formSchema, data);
  if (!v.ok) return { error: 'Revisa los campos del formulario.', fieldErrors: v.errors };

  const engine = new WorkflowEngine(proc.workflowDefinition as unknown as WorkflowDefinition);
  const now = new Date();
  const res = engine.apply(
    engine.start(now),
    { id: uid, roles: ['ciudadano'] },
    { action: 'enviar', guardOk: true },
    now,
  );

  let created: { requestCode: string; logId: string } | undefined;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const req = await tx.request.create({
          data: {
            code: genCode(),
            procedureTypeId: proc.id,
            citizenId: uid,
            currentState: res.instance.state,
            status: RequestStatus.EN_PROCESO,
            formData: data as Prisma.InputJsonValue,
            submittedAt: now,
            dueAt: res.dueAt,
          },
        });
        const log = await tx.workflowTransitionLog.create({
          data: {
            requestId: req.id,
            fromState: res.from,
            toState: res.to,
            action: res.action,
            actorId: uid,
            effects: res.effects as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: uid,
            action: 'request.created',
            entityType: 'Request',
            entityId: req.id,
            metadata: { code: req.code },
          },
        });
        return { requestCode: req.code, logId: log.id };
      });
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === 2) throw err;
    }
  }
  if (!created) return { error: 'No se pudo crear la solicitud. Intenta de nuevo.' };

  await tryEnqueue(created.logId, res.effects.length > 0);
  redirect(`/solicitudes/${created.requestCode}`);
}

export async function applyTransitionAction(
  code: string,
  _prev: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const session = await requireSession();
  const uid = session.user.id;

  const action = String(formData.get('action') ?? '');
  const comment = String(formData.get('comment') ?? '').trim() || undefined;
  if (!action) return { error: 'No se indicó la acción.' };

  const req = await getRequestByCode(code);
  if (!req) return { error: 'Solicitud no encontrada.' };

  const owner = req.citizen.id === uid;
  const sameInstitution = session.user.memberships.some(
    (m) => m.institutionId === req.procedureType.institutionId,
  );
  if (!owner && !sameInstitution) return { error: 'No tienes acceso a esta solicitud.' };

  const engine = new WorkflowEngine(
    req.procedureType.workflowDefinition as unknown as WorkflowDefinition,
  );
  const actor = { id: uid, roles: effectiveRoles(session, req.citizen.id) };
  const instance = { state: req.currentState, enteredStateAt: req.updatedAt };

  // Guard de negocio: (re)enviar exige un formulario válido.
  const guardOk =
    action === 'enviar' ? validate(req.procedureType.formSchema, req.formData).ok : true;

  const verdict = engine.can(instance, actor, { action, comment, guardOk });
  if (!verdict.ok) return { error: verdict.reason ?? 'Acción no permitida.' };

  const now = new Date();
  const res = engine.apply(instance, actor, { action, comment, guardOk }, now);
  const nextStatus = (res.outcome ?? RequestStatus.EN_PROCESO) as RequestStatus;

  const log = await prisma.$transaction(async (tx) => {
    await tx.request.update({
      where: { id: req.id },
      data: {
        currentState: res.instance.state,
        status: nextStatus,
        dueAt: res.dueAt,
        closedAt: res.done ? now : null,
      },
    });
    const l = await tx.workflowTransitionLog.create({
      data: {
        requestId: req.id,
        fromState: res.from,
        toState: res.to,
        action: res.action,
        actorId: uid,
        comment,
        effects: res.effects as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: uid,
        action: `request.${res.action}`,
        entityType: 'Request',
        entityId: req.id,
        metadata: { code: req.code, from: res.from, to: res.to },
      },
    });
    return l;
  });

  await tryEnqueue(log.id, res.effects.length > 0);
  revalidatePath(`/solicitudes/${code}`);
  revalidatePath('/solicitudes');
  return { ok: true };
}
