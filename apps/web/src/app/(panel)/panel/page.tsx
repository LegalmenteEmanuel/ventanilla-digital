import Link from 'next/link';
import { redirect } from 'next/navigation';

import { prisma } from '@vd/db';

import { Card, Stat } from '@/components/ui';
import { humanState } from '@/lib/format';
import { institutionIds, isStaff, requireSession } from '@/lib/rbac';

export default async function PanelPage() {
  const session = await requireSession();
  if (!isStaff(session)) redirect('/solicitudes');

  const scope = { procedureType: { institutionId: { in: institutionIds(session) } } };
  const now = new Date();

  const [total, enProceso, overdue, byState, closed] = await Promise.all([
    prisma.request.count({ where: scope }),
    prisma.request.count({ where: { ...scope, status: 'EN_PROCESO' } }),
    prisma.request.count({ where: { ...scope, status: 'EN_PROCESO', dueAt: { lt: now } } }),
    prisma.request.groupBy({ by: ['currentState'], where: scope, _count: { _all: true } }),
    prisma.request.findMany({
      where: { ...scope, closedAt: { not: null }, submittedAt: { not: null } },
      select: { submittedAt: true, closedAt: true },
    }),
  ]);

  const avgHours = closed.length
    ? closed.reduce((acc, r) => acc + (r.closedAt!.getTime() - r.submittedAt!.getTime()), 0) /
      closed.length /
      3_600_000
    : 0;

  const maxCount = Math.max(1, ...byState.map((s) => s._count._all));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Panel de gestión</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Solicitudes totales" value={total} />
        <Stat label="En proceso" value={enProceso} />
        <Stat label="SLA vencido" value={overdue} hint="requieren atención" />
        <Stat
          label="Resolución media"
          value={`${avgHours.toFixed(1)} h`}
          hint={`${closed.length} cerradas`}
        />
      </div>

      <Card>
        <h2 className="font-semibold text-slate-900">Solicitudes por estado</h2>
        <div className="mt-4 space-y-2">
          {byState.length === 0 && <p className="text-sm text-slate-500">Sin datos.</p>}
          {byState.map((s) => (
            <div key={s.currentState} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 text-slate-600">{humanState(s.currentState)}</span>
              <div className="h-5 flex-1 rounded bg-slate-100">
                <div
                  className="h-5 rounded bg-blue-500"
                  style={{ width: `${(s._count._all / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-slate-500">{s._count._all}</span>
            </div>
          ))}
        </div>
      </Card>

      <Link
        href="/solicitudes"
        className="inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        Ir a la bandeja de revisión →
      </Link>
    </div>
  );
}
