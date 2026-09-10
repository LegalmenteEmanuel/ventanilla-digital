import { prisma } from '@vd/db';

/**
 * Marca las solicitudes cuyo SLA venció y avisa una sola vez al ciudadano.
 *
 * ponytail: barrido completo cada 15 min; si el volumen crece, cambiar a un
 * job retardado por solicitud programado al entrar al estado.
 */
export async function scanSla(): Promise<void> {
  const now = new Date();
  const overdue = await prisma.request.findMany({
    where: { status: 'EN_PROCESO', dueAt: { lt: now } },
    select: { id: true, code: true, dueAt: true, citizenId: true, currentState: true },
  });

  let notified = 0;
  for (const req of overdue) {
    const already = await prisma.auditLog.findFirst({
      where: { entityType: 'Request', entityId: req.id, action: 'sla.breached' },
      select: { id: true },
    });
    if (already) continue;

    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          action: 'sla.breached',
          entityType: 'Request',
          entityId: req.id,
          metadata: { code: req.code, state: req.currentState, dueAt: req.dueAt?.toISOString() },
        },
      }),
      prisma.notification.create({
        data: {
          userId: req.citizenId,
          channel: 'IN_APP',
          subject: `Tu trámite ${req.code} excedió el tiempo objetivo`,
          body: `La solicitud ${req.code} lleva más tiempo del previsto en revisión. Estamos dándole seguimiento.`,
          status: 'ENVIADA',
          sentAt: now,
        },
      }),
    ]);
    notified++;
  }

  console.log(`[sla] ${overdue.length} vencidas · ${notified} nuevas notificaciones`);
}
