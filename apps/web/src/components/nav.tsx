'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logoutAction } from '@/actions/auth';

export function Nav({ email, isStaff }: { email: string; isStaff: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: '/tramites', label: 'Trámites' },
    { href: '/solicitudes', label: 'Solicitudes' },
    ...(isStaff ? [{ href: '/panel', label: 'Panel' }] : []),
    { href: '/verificar', label: 'Verificación' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/tramites" className="font-semibold tracking-tight text-blue-900">
            Ventanilla Digital
          </Link>
          <nav className="flex gap-1 text-sm">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 ${
                    active
                      ? 'bg-blue-50 font-medium text-blue-800'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{email}</span>
          <form action={logoutAction}>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
