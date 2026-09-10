import { prisma } from '@vd/db';

/** Solicitud con todo lo que necesita la vista de detalle. */
export function getRequestByCode(code: string) {
  return prisma.request.findUnique({
    where: { code },
    include: {
      citizen: { select: { id: true, name: true, email: true } },
      procedureType: { include: { institution: { select: { id: true, name: true } } } },
      transitions: {
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { name: true, email: true } } },
      },
      signature: true,
    },
  });
}

export type RequestDetail = NonNullable<Awaited<ReturnType<typeof getRequestByCode>>>;
