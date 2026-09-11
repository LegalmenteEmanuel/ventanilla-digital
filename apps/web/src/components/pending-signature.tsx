'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * La firma y el PDF los genera `apps/worker` de forma asíncrona tras aprobar.
 * Mientras no aparezcan, refresca la ruta cada 2s (máx. 15 intentos) para que
 * el usuario no tenga que recargar a mano.
 */
export function PendingSignature() {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 15) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, 2_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <p className="flex items-center gap-2 text-sm text-slate-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      Firmando y generando el documento…
    </p>
  );
}
