'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function VerificarPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-lg font-semibold tracking-tight text-blue-900">
        Ventanilla Digital
      </Link>

      <h1 className="mt-8 text-xl font-semibold text-slate-900">Verificar documento</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ingresa el código de verificación impreso en el PDF (formato VD-XXXX-XXXX-XXXX).
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.trim().toUpperCase();
          if (c) router.push(`/verificar/${encodeURIComponent(c)}`);
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="VD-1A2B-3C4D-5E6F"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
          Verificar
        </button>
      </form>
    </div>
  );
}
