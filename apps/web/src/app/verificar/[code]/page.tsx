import Link from 'next/link';

import { prisma } from '@vd/db';

import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className={`text-slate-800 ${mono ? 'break-all font-mono text-xs' : 'text-sm'}`}>{v}</dd>
    </div>
  );
}

export default async function VerificarResultadoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const signature = await prisma.signature.findUnique({
    where: { verificationCode: decodeURIComponent(code) },
    include: {
      request: {
        include: { procedureType: { include: { institution: { select: { name: true } } } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-lg font-semibold tracking-tight text-blue-900">
        Ventanilla Digital
      </Link>

      {!signature ? (
        <div className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="font-semibold text-rose-800">Documento no encontrado</h1>
          <p className="mt-1 text-sm text-rose-700">
            El código <span className="font-mono">{code}</span> no corresponde a ningún documento
            emitido por la plataforma.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h1 className="font-semibold text-emerald-800">✓ Documento auténtico</h1>
          <dl className="mt-4 space-y-2">
            <Row k="Trámite" v={signature.request.procedureType.name} />
            <Row k="Institución" v={signature.request.procedureType.institution.name} />
            <Row k="Solicitud" v={signature.request.code} />
            <Row k="Emitido" v={fmtDate(signature.createdAt)} />
            <Row k="Algoritmo de firma" v={signature.algorithm} />
            <Row k="Hash SHA-256" v={signature.documentHash} mono />
            <Row k="Certificado" v={signature.certificateSubject} />
          </dl>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        <Link href="/verificar" className="hover:underline">
          Verificar otro documento
        </Link>
      </p>
    </div>
  );
}
