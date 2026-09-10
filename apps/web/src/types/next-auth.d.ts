import type { DefaultSession } from 'next-auth';

import type { MembershipClaim } from '../lib/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      memberships: MembershipClaim[];
      roles: string[];
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    memberships?: MembershipClaim[];
  }
}
