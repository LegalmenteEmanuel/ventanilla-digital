import type { ReactNode } from 'react';

import { Nav } from '@/components/nav';
import { isStaff, requireSession } from '@/lib/rbac';

// Todo el panel depende de la sesión y de la base: nunca se prerenderiza.
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen">
      <Nav email={session.user.email ?? ''} isStaff={isStaff(session)} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
