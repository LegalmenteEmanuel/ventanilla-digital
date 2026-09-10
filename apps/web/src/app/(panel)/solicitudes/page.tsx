import Link from 'next/link';

import { prisma } from '@vd/db';

import { EmptyState, StateBadge } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { institutionIds, isStaff, requireSession } from '@/lib/rbac';

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const session = await requireSession();
  const { vista } = await searchParams;
  const staff = isStaff(session);
  const showBandeja = staff && vista !== 'mias';

  const rows = showBandeja
    ? await prisma.request.findMany({
        where: {
          currentState: { in: ['enviada', 'en_revision'] },
          procedureType: { institutionId: { in: institutionIds(session) } },
        },
        include: {
          procedureType: { select: { name: true } },
          citizen: { select: { name: true, email: true } },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      })
    : await prisma.request.findMany({
        where: { citizenId: session.user.id },
        include: {
          procedureType: { select: { name: true } },
          citizen: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

  const now = Date.now();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {showBandeja ? 'Bandeja de revisión' : 'Mis solicitudes'}
        </h1>
        {staff && (
          <div className="flex gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 text-sm">
            <Link
              href="/solicitudes"
              className={`rounded px-3 py-1 ${showBandeja ? 'bg-blue-50 font-medium text-blue-800' : 'text-slate-600'}`}
            >
              Bandeja
            </Link>
            <Link
              href="/solicitudes?vista=mias"
              className={`rounded px-3 py-1 ${!showBandeja ? 'bg-blue-50 font-medium text-blue-800' : 'text-slate-600'}`}
            >
              Mías
            </Link>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState>No hay solicitudes que mostrar.</EmptyState>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Trámite</th>
                {showBandeja && <th className="px-4 py-2.5">Ciudadano</th>}
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Límite SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const overdue = r.dueAt && r.status === 'EN_PROCESO' && r.dueAt.getTime() < now;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/solicitudes/${r.code}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {r.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.procedureType.name}</td>
                    {showBandeja && (
                      <td className="px-4 py-2.5 text-slate-600">
                        {r.citizen.name ?? r.citizen.email}
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <StateBadge state={r.currentState} />
                    </td>
                    <td
                      className={`px-4 py-2.5 ${overdue ? 'font-medium text-rose-600' : 'text-slate-500'}`}
                    >
                      {fmtDate(r.dueAt)}
                      {overdue ? ' · vencido' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
