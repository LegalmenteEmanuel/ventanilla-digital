'use server';

import { AuthError } from 'next-auth';

import { signIn, signOut } from '@/auth';

export type LoginState = { error?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/solicitudes',
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Correo o contraseña incorrectos.' };
    throw error; // redirect() de Next debe propagarse
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}
