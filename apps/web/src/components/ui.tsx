import type { ReactNode } from 'react';

import { humanState } from '@/lib/format';

const STATE_STYLES: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-700 ring-slate-200',
  enviada: 'bg-blue-50 text-blue-700 ring-blue-200',
  en_revision: 'bg-amber-50 text-amber-800 ring-amber-200',
  aprobada: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rechazada: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function StateBadge({ state }: { state: string }) {
  const style = STATE_STYLES[state] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span
      data-testid="state-badge"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {humanState(state)}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-2xl font-semibold text-slate-900">{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
