'use client';

import { useActionState } from 'react';

import { createRequestAction, type RequestActionState } from '@/actions/requests';
import { JsonSchemaForm } from '@/components/json-schema-form';
import type { JsonSchema } from '@/lib/schema';

export function NuevaSolicitudForm({ slug, schema }: { slug: string; schema: JsonSchema }) {
  const [state, formAction, pending] = useActionState<RequestActionState, FormData>(
    createRequestAction.bind(null, slug),
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <JsonSchemaForm schema={schema} disabled={pending} />

      {state && 'error' in state && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-medium">{state.error}</p>
          {state.fieldErrors && state.fieldErrors.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {state.fieldErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  );
}
