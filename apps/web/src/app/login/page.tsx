'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { loginAction, type LoginState } from '@/actions/auth';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight text-blue-900">
        Ventanilla Digital
      </Link>

      <h1 className="text-xl font-semibold text-slate-900">Ingresar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Accede con tu correo institucional o de ciudadano.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Correo</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Contraseña</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
        >
          {pending ? 'Verificando…' : 'Ingresar'}
        </button>
      </form>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          Cuentas de demostración (contraseña: Password123!)
        </p>
        <p className="mt-1">
          revisor@alcaldia-demo.local · funcionario@alcaldia-demo.local · ana@correo.local
        </p>
      </div>
    </div>
  );
}
