import Link from 'next/link';

import { prisma } from '@vd/db';

import { Card, EmptyState } from '@/components/ui';

export default async function TramitesPage() {
  const procedures = await prisma.procedureType.findMany({
    where: { active: true },
    include: { institution: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Catálogo de trámites</h1>
      <p className="mt-1 text-sm text-slate-500">Elige un trámite para iniciar una solicitud.</p>

      {procedures.length === 0 ? (
        <div className="mt-6">
          <EmptyState>
            No hay trámites publicados. Ejecuta <code className="font-mono">pnpm db:seed</code>.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {procedures.map((p) => (
            <Card key={p.id}>
              <p className="text-xs uppercase tracking-wide text-slate-400">{p.institution.name}</p>
              <h2 className="mt-1 font-semibold text-slate-900">{p.name}</h2>
              {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
              <Link
                href={`/tramites/${p.slug}/nueva`}
                className="mt-4 inline-block rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
              >
                Iniciar solicitud
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
