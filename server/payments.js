import { config } from './config.js';

// Pluggable payment provider layer.
//
// PAYMENT_PROVIDER controls which provider is active:
//   mock      (default)  records checkout + confirmation locally, no network
//   paystack              uses Paystack (NGN) when PAYSTACK_SECRET_KEY is set
//   flutterwave           uses Flutterwave when FLW_SECRET_KEY is set
//   stripe                uses Stripe when STRIPE_SECRET_KEY is set
//
// Each provider supports:
//   createPayment({ amountCents, currency, email, reference, callbackUrl, metadata })
//   verifyPayment(reference)

const providerName = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();

export function getPaymentProviderName() {
  return providerName;
}

export function isMockProvider() {
  return providerName === 'mock';
}

export function getProviderConfig() {
  return {
    name: providerName,
    paystackKey: process.env.PAYSTACK_SECRET_KEY || '',
    flwKey: process.env.FLW_SECRET_KEY || '',
    stripeKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    callbackUrl: `${config.appUrl}/payments/callback`,
  };
}

async function requestJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || Object.values(data || {}).join(' ') || `Payment request failed (${res.status})`);
  return data;
}

async function paystackCreate({ amountCents, currency, email, reference, callbackUrl }) {
  const cfg = getProviderConfig();
  if (!cfg.paystackKey) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  const data = await requestJson(
    'https://api.paystack.co/transaction/initialize',
    { Authorization: `Bearer ${cfg.paystackKey}` },
    { amount: Math.round(amountCents / 100), currency, email, reference, callback_url: callbackUrl },
  );
  return { checkoutUrl: data?.data?.authorization_url, reference: data?.data?.reference || reference };
}

async function paystackVerify(reference) {
  const cfg = getProviderConfig();
  if (!cfg.paystackKey) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${cfg.paystackKey}` },
  });
  const data = await res.json().catch(() => ({}));
  const status = data?.data?.status;
  if (status === 'success') return { verified: true, providerRef: reference };
  if (status === 'failed' || status === 'abandoned') return { verified: false, providerRef: reference };
  throw new Error('Payment not yet confirmed.');
}

async function flutterwaveCreate({ amountCents, currency, email, reference, callbackUrl }) {
  const cfg = getProviderConfig();
  if (!cfg.flwKey) throw new Error('FLW_SECRET_KEY is not configured.');
  const data = await requestJson(
    'https://api.flutterwave.com/v3/payments',
    { Authorization: `Bearer ${cfg.flwKey}` },
    {
      tx_ref: reference,
      amount: (amountCents / 100).toFixed(2),
      currency,
      redirect_url: callbackUrl,
      customer: { email },
      customizations: { title: 'iConnect booking', description: 'Music booking fee' },
    },
  );
  return { checkoutUrl: data?.data?.link, reference };
}

async function flutterwaveVerify(reference) {
  const cfg = getProviderConfig();
  if (!cfg.flwKey) throw new Error('FLW_SECRET_KEY is not configured.');
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${cfg.flwKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (data?.data?.status === 'successful') return { verified: true, providerRef: reference };
  if (data?.data?.status === 'failed') return { verified: false, providerRef: reference };
  throw new Error('Payment not yet confirmed.');
}

async function stripeCreate({ amountCents, currency, email, reference, callbackUrl, metadata }) {
  const cfg = getProviderConfig();
  if (!cfg.stripeKey) throw new Error('STRIPE_SECRET_KEY is not configured.');
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(Math.round(amountCents)),
      'line_items[0][price_data][product_data][name]': 'iConnect booking fee',
      'line_items[0][quantity]': '1',
      'customer_email': email,
      'success_url': callbackUrl,
      'cancel_url': callbackUrl,
      'client_reference_id': reference,
      'metadata[payment_ref]': reference,
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'Stripe session creation failed.');
  return { checkoutUrl: data.url, sessionId: data.id, reference };
}

async function stripeVerify(reference) {
  const cfg = getProviderConfig();
  if (!cfg.stripeKey) throw new Error('STRIPE_SECRET_KEY is not configured.');
  // Stripe has no verify-by-reference endpoint; check via payment intent/search is complex,
  // so we require a signed webhook in production. Return not-verified here.
  throw new Error('Stripe verification requires the webhook endpoint.');
}

export async function createProviderPayment(payload) {
  if (providerName === 'paystack') return paystackCreate(payload);
  if (providerName === 'flutterwave') return flutterwaveCreate(payload);
  if (providerName === 'stripe') return stripeCreate(payload);
  throw new Error(`Unknown PAYMENT_PROVIDER "${providerName}".`);
}

export async function verifyProviderPayment(reference) {
  if (providerName === 'paystack') return paystackVerify(reference);
  if (providerName === 'flutterwave') return flutterwaveVerify(reference);
  if (providerName === 'stripe') return stripeVerify(reference);
  return { verified: true, providerRef: reference };
}

export function buildMockPayment() {
  return { checkoutUrl: null, reference: null };
}
