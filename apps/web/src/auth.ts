import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { prisma } from '@vd/db';
import { verifyPassword } from '@vd/db/password';

import type { MembershipClaim } from '@/lib/types';

/** Forma de nuestros datos dentro del JWT (evita depender de la augmentación de módulos). */
type TokenBag = { uid?: string; memberships?: MembershipClaim[] };

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = String(raw?.email ?? '')
          .trim()
          .toLowerCase();
        const password = String(raw?.password ?? '');
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        return { id: user.id, email: user.email, name: user.name ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const rows = await prisma.membership.findMany({
          where: { userId: user.id },
          include: { institution: { select: { name: true } } },
        });
        const claims: MembershipClaim[] = rows.map((m) => ({
          institutionId: m.institutionId,
          institutionName: m.institution.name,
          role: m.role,
        }));
        const bag = token as TokenBag;
        bag.uid = user.id;
        bag.memberships = claims;
      }
      return token;
    },
    async session({ session, token }) {
      const bag = token as TokenBag;
      const memberships = bag.memberships ?? [];
      session.user.id = bag.uid ?? '';
      session.user.memberships = memberships;
      const roles = new Set(memberships.map((m) => m.role.toLowerCase()));
      roles.add('ciudadano');
      session.user.roles = [...roles];
      return session;
    },
  },
});
