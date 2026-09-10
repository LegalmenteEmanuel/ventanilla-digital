import nodemailer from 'nodemailer';

import { env } from './env.ts';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  // Mailhog no pide autenticación.
});

export async function sendMail(msg: { to: string; subject: string; text: string }): Promise<void> {
  await transport.sendMail({ from: env.SMTP_FROM, ...msg });
}
