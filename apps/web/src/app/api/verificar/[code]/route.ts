import { prisma } from '@vd/db';

/**
 * Verificación pública de un documento firmado. No requiere autenticación.
 * GET /api/verificar/VD-XXXX-XXXX-XXXX
 */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;

  const signature = await prisma.signature.findUnique({
    where: { verificationCode: decodeURIComponent(code) },
    include: {
      request: {
        include: { procedureType: { include: { institution: { select: { name: true } } } } },
      },
    },
  });

  if (!signature) {
    return Response.json({ valid: false }, { status: 404 });
  }

  return Response.json({
    valid: true,
    codigoVerificacion: signature.verificationCode,
    solicitud: signature.request.code,
    procedimiento: signature.request.procedureType.name,
    institucion: signature.request.procedureType.institution.name,
    emitidoEl: signature.createdAt.toISOString(),
    algoritmo: signature.algorithm,
    hash: signature.documentHash,
    certificado: signature.certificateSubject,
  });
}
