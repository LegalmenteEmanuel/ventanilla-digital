import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';

import { auth } from '@/auth';

export const STAFF_ROLES = ['funcionario', 'revisor', 'admin_institucional', 'superadmin'];

/** Sesión garantizada; redirige a /login si no hay. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session;
}

export function isStaff(session: Session): boolean {
  return session.user.roles.some((r) => STAFF_ROLES.includes(r));
}

export function institutionIds(session: Session): string[] {
  return session.user.memberships.map((m) => m.institutionId);
}

/**
 * Roles efectivos del actor para una solicitud concreta: se descarta
 * `ciudadano` si no es el dueño (evita que un funcionario "envíe" borradores
 * ajenos).
 */
export function effectiveRoles(session: Session, ownerId: string): string[] {
  const roles = new Set(session.user.roles);
  if (session.user.id !== ownerId) roles.delete('ciudadano');
  return [...roles];
}
