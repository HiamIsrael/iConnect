import { config } from './config.js';

// Pluggable email sender. In development it logs to the console so flows can be
// tested without real SMTP credentials. Swap in SMTP / Resend when configured.
export async function sendEmail({ to, subject, text, html }) {
  const provider = config.email.provider;

  if (provider === 'console' || (!config.email.smtpHost && !config.email.resendKey)) {
    console.log(`[email:console] to=${to} subject="${subject}"`);
    console.log(`[email:console] ${text || html || ''}`);
    return { ok: true, provider: 'console' };
  }

  if (provider === 'resend' && config.email.resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.email.from,
        to: [to],
        subject,
        text: text || '',
        html: html || text || '',
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
    return { ok: true, provider: 'resend' };
  }

  if (provider === 'smtp' && config.email.smtpHost) {
    // Minimal SMTP via nodemailer is not bundled; use SMTP provider configured externally.
    throw new Error('SMTP sending requires a configured mail transport. Set EMAIL_PROVIDER=resend or console.');
  }

  return { ok: true, provider: 'console' };
}
