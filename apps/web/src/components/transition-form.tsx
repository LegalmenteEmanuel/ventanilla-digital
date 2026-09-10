'use client';

import { useActionState } from 'react';

import { applyTransitionAction, type RequestActionState } from '@/actions/requests';

export interface TransitionOption {
  action: string;
  label: string;
  requiresComment?: boolean;
  danger?: boolean;
}

export function TransitionForm({ code, options }: { code: string; options: TransitionOption[] }) {
  const [state, formAction, pending] = useActionState<RequestActionState, FormData>(
    applyTransitionAction.bind(null, code),
    null,
  );

  if (options.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay acciones disponibles para tu rol en este estado.
      </p>
    );
  }

  const commentHint = options.some((o) => o.requiresComment)
    ? 'Comentario (obligatorio para devolver o rechazar)'
    : 'Comentario (opcional)';

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="comment"
        rows={3}
        placeholder={commentHint}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.action}
            name="action"
            value={o.action}
            disabled={pending}
            className={`rounded-md px-3.5 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-50 ${
              o.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {state && 'error' in state && <p className="text-sm text-rose-600">{state.error}</p>}
      {state && 'ok' in state && state.ok && (
        <p className="text-sm text-emerald-600">Acción aplicada correctamente.</p>
      )}
    </form>
  );
}
