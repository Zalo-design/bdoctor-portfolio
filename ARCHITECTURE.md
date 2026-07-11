# B-Doctor — Architecture Overview

A high-level, sanitized description of how B-Doctor is built. It omits secrets, exact internal endpoints, and anything that would widen the attack surface of the live system.

## 1. System shape
B-Doctor is a **modular monolith**: a single Node.js/Express API organized into ~40 domain route modules, backed by one MySQL database (~85 tables). Web and mobile clients are thin; **all business logic, data access, and third-party calls live behind the API** — clients never talk to the database or to external providers directly.

```
┌─────────────────────────────┐        ┌───────────────────────────────┐
│  Clients                    │        │  Third-party services         │
│  • Web (React 19 + Vite)    │        │  • WhatsApp Cloud API         │
│  • Android (Capacitor)      │        │  • Mercado Pago / PayPal      │
└──────────────┬──────────────┘        │  • Google OAuth + Calendar    │
               │ HTTPS (JWT)            │  • AI (clinical summaries)    │
               ▼                        └───────────────▲───────────────┘
┌─────────────────────────────────────────────────────┼──────────────┐
│  REST API — Node.js + Express                        │              │
│  auth (JWT + 2FA) · per-org scoping · 40 modules ────┘              │
│  Socket.io (real-time: teleconsultation, notifications)             │
└──────────────┬──────────────────────────────────────────────────────┘
               ▼
        ┌──────────────┐        Ops: VPS + PM2 · automated deploy
        │  MySQL 8     │        · daily encrypted off-site backups
        └──────────────┘
```

## 2. Request lifecycle
Every authenticated request follows the same path:

1. **Auth** — `requireAuth` verifies the JWT signature (constant-time) and expiry; optional TOTP 2FA for sensitive roles.
2. **Tenant resolution** — the caller's `organization` is resolved and membership is confirmed (`usuarios_roles`). This id scopes everything downstream.
3. **Authorization** — role checks (owner / staff / superadmin) gate the action.
4. **Handler** — the domain module runs the operation, always filtering queries by `organizacion_id`.
5. **Side effects** — notifications (Socket.io), WhatsApp messages, or payment calls are dispatched through their dedicated service layers.

## 3. Domains (selected)
| Domain | Responsibility |
|---|---|
| Auth & tenancy | Registration, JWT, 2FA, sessions, roles, organizations |
| Clinical | Patients, medical records, consultations, prescriptions, studies |
| Scheduling | Appointments, availability, reschedules, public booking links |
| Teleconsultation | Video sessions, split payments, disputes, tamper-evident acts |
| Billing & subscriptions | Plans, payments (MP/PayPal), invoicing, insurer settlement |
| Automation | WhatsApp assistant (B-Connect): booking, reminders, waitlist |
| AI | Clinical summaries, usage metrics |
| Platform ops | Auditing, moderation, support, global messaging |

## 4. Multi-tenancy & security architecture
- **Per-organization isolation** is the backbone: every read/write is filtered by the resolved `organizacion_id`, so no account can reach another org's data. Owner-vs-staff roles further restrict what each user sees (e.g. a receptionist never sees billing).
- **Defense in depth:** JWT (dedicated secret, constant-time checks) + optional TOTP 2FA + session tracking; per-IP rate limiting and free-trial caps; email verification; CAPTCHA (Turnstile) on auth flows.
- **Integrity & non-repudiation:** teleconsultation acts are sealed in a **SHA-256 hash chain** so a completed record can't be altered without breaking the chain — important for dispute handling.
- **Document authenticity:** generated PDFs carry QR codes for public verification; delivered assets are watermarked.
- **Data protection:** encryption, controlled access, and **daily encrypted off-site backups** with verified restores.

## 5. Integrations
- **Mercado Pago (marketplace split):** patients pay the professional; the platform's commission is retained at the source via OAuth-connected sellers; webhooks are signature-verified. (`samples/mercadopago-split.js`)
- **WhatsApp Business Cloud API:** an automated assistant that books appointments, sends day-before/hour-before reminders, and lets patients confirm or cancel by replying — freeing a released slot back into the agenda automatically.
- **Google OAuth 2.0 + Calendar:** sign-in and two-way agenda sync.
- **Provider-agnostic layer** (adapter pattern) for external services such as e-prescriptions, avoiding vendor lock-in. (`samples/integration-adapter.js`)

## 6. Real-time
Socket.io powers live teleconsultation (waiting room, in-call messaging) and in-app notifications, so professionals see new WhatsApp requests and events without refreshing.

## 7. Deployment & operations
- Built with Vite; the backend runs under **PM2** on a Linux VPS.
- A **single-command deploy pipeline** packages the code, rebuilds the frontend on the server, and restarts the process; static SEO pages and assets are served alongside the SPA.
- **Daily encrypted database backups** are pushed off-site, with restoration tested.

## 8. Scalability & roadmap
- Current stage suits a single-region SaaS; the modular boundaries make it straightforward to extract heavy domains (e.g. teleconsultation, AI) into separate services later.
- Ongoing: replacing N+1 query patterns with JOINs, adding a cache layer for non-sensitive data, and observability (error/metrics monitoring).

---
*This document is a sanitized overview for portfolio/hiring purposes. The production codebase is private for security and regulatory reasons.*
