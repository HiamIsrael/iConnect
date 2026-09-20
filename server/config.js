import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: bool(process.env.NODE_ENV, false) || bool(process.env.IS_PRODUCTION, false),
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT) || 3000,
  root: ROOT,
  dataDir: process.env.ICONNECT_DATA_DIR || path.join(ROOT, 'data'),
  uploadsDir: process.env.ICONNECT_UPLOADS_DIR || path.join(ROOT, 'data', 'uploads'),
  databaseUrl: process.env.DATABASE_URL || '',
  sqliteFile: process.env.ICONNECT_DB_FILE || path.join(ROOT, 'data', 'iconnect.sqlite'),
  jwtSecret: process.env.JWT_SECRET || 'iconnect-dev-secret-change-me',
  jwtTtl: process.env.JWT_TTL || '7d',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console', // console | smtp | resend
    from: process.env.EMAIL_FROM || 'iConnect <no-reply@iconnect.local>',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    resendKey: process.env.RESEND_API_KEY || '',
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock', // mock | paystack | flutterwave | stripe
    paystackKey: process.env.PAYSTACK_SECRET_KEY || '',
    flwKey: process.env.FLW_SECRET_KEY || '',
    stripeKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    callbackUrl: process.env.PAYMENT_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/payments/callback`,
  },
};
