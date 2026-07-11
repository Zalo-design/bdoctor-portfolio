/**
 * Provider-agnostic integration via the Adapter pattern — sanitized excerpt.
 *
 * B-Doctor talks to external services (e.g. e-prescription providers) through a
 * single internal interface. Each provider implements the same contract, so the
 * rest of the system never depends on a specific vendor and swapping providers
 * (or supporting several) requires no changes upstream — no vendor lock-in.
 *
 * NOTE: Illustrative. No real provider names, endpoints or credentials.
 */
'use strict';

/**
 * The contract every prescription provider must fulfill.
 * @typedef {Object} PrescriptionProvider
 * @property {(rx: object) => Promise<{externalId: string, pdfUrl: string}>} issue
 * @property {(externalId: string) => Promise<{status: string}>} status
 * @property {(externalId: string) => Promise<void>} cancel
 */

/** Example provider A (REST/JSON). */
class ProviderA {
  constructor({ baseUrl, apiKey }) { this.baseUrl = baseUrl; this.apiKey = apiKey; }
  async issue(rx) {
    const res = await this._post('/prescriptions', mapToProviderA(rx));
    return { externalId: res.id, pdfUrl: res.document_url };
  }
  async status(id) { return { status: (await this._get(`/prescriptions/${id}`)).state }; }
  async cancel(id) { await this._post(`/prescriptions/${id}/cancel`, {}); }
  _headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` }; }
  async _post(p, b) { return json(await fetch(this.baseUrl + p, { method: 'POST', headers: this._headers(), body: JSON.stringify(b) })); }
  async _get(p) { return json(await fetch(this.baseUrl + p, { headers: this._headers() })); }
}

/** Example provider B (different API shape — same contract). */
class ProviderB {
  constructor({ baseUrl, token }) { this.baseUrl = baseUrl; this.token = token; }
  async issue(rx) {
    const res = await json(await fetch(`${this.baseUrl}/v2/rx`, {
      method: 'POST',
      headers: { 'X-Auth': this.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(mapToProviderB(rx)),
    }));
    return { externalId: res.reference, pdfUrl: res.pdf };
  }
  async status(id) { return { status: (await json(await fetch(`${this.baseUrl}/v2/rx/${id}`, { headers: { 'X-Auth': this.token } }))).status }; }
  async cancel(id) { await fetch(`${this.baseUrl}/v2/rx/${id}`, { method: 'DELETE', headers: { 'X-Auth': this.token } }); }
}

/** Factory: the app asks for "a prescription provider" and stays vendor-agnostic. */
function getPrescriptionProvider(config = require('./config')) {
  switch (config.PRESCRIPTION_PROVIDER) {
    case 'A': return new ProviderA(config.providerA);
    case 'B': return new ProviderB(config.providerB);
    default: throw new Error(`Unknown prescription provider: ${config.PRESCRIPTION_PROVIDER}`);
  }
}

// Per-provider field mapping keeps the internal prescription shape stable.
const mapToProviderA = (rx) => ({ patient: rx.patientId, drug: rx.drug, dose: rx.dose, notes: rx.notes });
const mapToProviderB = (rx) => ({ subject: rx.patientId, medication: rx.drug, posology: rx.dose, remarks: rx.notes });
const json = async (res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); };

module.exports = { getPrescriptionProvider, ProviderA, ProviderB };
