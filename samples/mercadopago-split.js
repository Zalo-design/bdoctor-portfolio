/**
 * Marketplace-style split payment (Mercado Pago) — sanitized illustrative excerpt.
 *
 * From B-Doctor's teleconsultation flow: the patient pays the professional's fee,
 * the platform automatically retains a commission, and the rest is credited to the
 * professional's linked Mercado Pago account. Uses OAuth-connected sellers
 * (marketplace) so funds are split at the source, and verifies webhook signatures.
 *
 * NOTE: No real keys, endpoints or amounts. Not production code.
 */
'use strict';

const crypto = require('crypto');

// Injected from a secret manager / env — never hardcoded.
const { MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, PLATFORM_FEE_PCT } = require('./config');

/**
 * Create a checkout preference where the platform keeps `application_fee`
 * and the professional (marketplace seller) receives the remainder.
 */
async function createSplitPreference({ professional, consult, amount }) {
  const applicationFee = round2(amount * PLATFORM_FEE_PCT); // e.g. platform commission
  const body = {
    items: [{
      title: `Teleconsultation — ${professional.displayName}`,
      quantity: 1,
      unit_price: amount,
      currency_id: 'ARS',
    }],
    // Split at source: fee to the platform, remainder to the connected seller.
    marketplace_fee: applicationFee,
    external_reference: consult.id,
    notification_url: buildWebhookUrl(consult.id),
    back_urls: buildReturnUrls(consult.id),
    auto_return: 'approved',
  };

  // The seller's OAuth access token authorizes charging on their behalf.
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${professional.mpAccessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MP preference failed: ${res.status}`);

  const pref = await res.json();
  return { checkoutUrl: pref.init_point, preferenceId: pref.id, applicationFee };
}

/**
 * Verify the authenticity of an incoming Mercado Pago webhook before trusting it.
 * (Signature scheme simplified for illustration.)
 */
function verifyWebhookSignature(req) {
  const signature = req.headers['x-signature'] || '';
  const payload = `${req.query['data.id']}:${req.headers['x-request-id']}`;
  const expected = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  // Constant-time comparison to avoid timing attacks.
  return safeEqual(signature, expected);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

const round2 = (n) => Math.round(n * 100) / 100;
const buildWebhookUrl = (id) => `https://api.example.com/webhooks/mp/${id}`;
const buildReturnUrls = (id) => ({
  success: `https://app.example.com/consult/${id}?status=ok`,
  failure: `https://app.example.com/consult/${id}?status=fail`,
});

module.exports = { createSplitPreference, verifyWebhookSignature };
