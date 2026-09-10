import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { auth } from '@/auth';
import { getRequestByCode } from '@/lib/data';
import { institutionIds } from '@/lib/rbac';

export const runtime = 'nodejs';

/** Sirve el PDF firmado de una solicitud. Sólo el dueño o personal de la institución. */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response('No autorizado', { status: 401 });

  const { code } = await ctx.params;
  const req = await getRequestByCode(code);
  if (!req?.signature?.pdfStorageKey) {
    return new Response('Documento no disponible', { status: 404 });
  }

  const owner = req.citizen.id === session.user.id;
  const sameInstitution = institutionIds(session).includes(req.procedureType.institutionId);
  if (!owner && !sameInstitution) return new Response('Prohibido', { status: 403 });

  const dir = process.env.STORAGE_LOCAL_DIR ?? './.storage';
  const bytes = await readFile(resolve(dir, req.signature.pdfStorageKey));

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${code}.pdf"`,
    },
  });
}
