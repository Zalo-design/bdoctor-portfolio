/**
 * Authentication + multi-tenant data isolation — sanitized illustrative excerpt.
 *
 * Two ideas that run through the whole B-Doctor backend:
 *  1. Every authenticated request carries a verified JWT (with optional TOTP 2FA).
 *  2. Every data access is scoped to the caller's organization, so one account can
 *     never read or write another organization's data (per-tenant isolation).
 *
 * NOTE: Illustrative. Secrets come from a secret manager; nothing is hardcoded.
 */
'use strict';

const crypto = require('crypto');
const speakeasy = require('speakeasy'); // TOTP 2FA
const { JWT_SECRET } = require('./config');

// ── JWT (HS256) with constant-time signature check ─────────────────────────────
const b64url = (buf) => Buffer.from(buf).toString('base64url');

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
  return `${data}.${sig}`;
}

function verifyToken(token) {
  const [header, body, sig] = String(token).split('.');
  if (!header || !body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
  // timingSafeEqual prevents leaking validity through response timing.
  const a = Buffer.from(sig), e = Buffer.from(expected);
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

// ── Express middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

function verify2FA(userSecret, code) {
  return speakeasy.totp.verify({ secret: userSecret, encoding: 'base32', token: code, window: 1 });
}

// ── Multi-tenant scoping ───────────────────────────────────────────────────────
/**
 * Resolve the caller's organization and confirm membership. Every subsequent
 * query is filtered by this organizacion_id — the core of tenant isolation.
 */
async function resolveOrg(req, db) {
  const userId = Number(req.user.sub);
  const orgId = Number(req.query.orgId || req.body.orgId || 0);
  const rows = await db.query(
    `SELECT 1 FROM usuarios_roles WHERE usuario_id = ? AND organizacion_id = ? LIMIT 1`,
    [userId, orgId],
  );
  if (!rows.length && !isSuperadmin(req)) {
    const err = new Error('Forbidden: not a member of this organization');
    err.status = 403;
    throw err;
  }
  return orgId;
}

// Example of an org-scoped read: the WHERE clause makes cross-tenant access impossible.
async function listPatients(req, db) {
  const orgId = await resolveOrg(req, db);
  return db.query(
    `SELECT id, nombres, apellidos FROM pacientes WHERE organizacion_id = ? ORDER BY apellidos`,
    [orgId],
  );
}

function isSuperadmin(req) {
  const roles = (req.user && req.user.roles) || [];
  return roles.map((r) => String(r).toUpperCase()).includes('SUPERADMIN');
}

module.exports = { signToken, verifyToken, requireAuth, verify2FA, resolveOrg, listPatients, isSuperadmin };
