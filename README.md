# B-Doctor — Case Study & Sanitized Code Samples

**Production SaaS / CRM for healthcare professionals in Latin America — designed and built solo, end to end.**

🔗 Live: **[bdoctorplatform.com](https://www.bdoctorplatform.com)**

> ⚠️ **Why this repo doesn't contain the full source.** B-Doctor is a live medical platform handling real patient data, and its value proposition includes security and regulatory compliance. Open-sourcing a production healthcare application would be irresponsible. This repository holds a recruiter-facing case study plus **sanitized, illustrative excerpts** — no secrets, no real data, no live endpoints. The full codebase is private; a guided walkthrough or supervised access is available on request.

---

## My role
Sole **Full-Stack Developer & UX Designer** — research, database design, backend, frontend, DevOps, and product/design, with no team. I use an **agentic AI coding workflow** (Claude Max via Zencoder / Antigravity) to accelerate implementation under my direction, following a consistent method: **research → analysis → database design → backend → frontend.**

## What B-Doctor is
An all-in-one platform for medical professionals and clinics: appointment scheduling, digital medical records, a patient portal, WhatsApp-based booking, video teleconsultation with online payment, billing, prescriptions, insurer/coverage settlement, an internal community, and AI-assisted clinical summaries.

## Tech stack
- **Backend:** Node.js + Express, MySQL (mysql2), JWT auth, 2FA (TOTP), Socket.io
- **Frontend:** React 19 + TypeScript, Vite, TailwindCSS; **Android app** via Capacitor
- **Infra:** VPS + PM2, automated deploy pipeline, daily encrypted off-site backups

## Architecture (high level)
Web and mobile clients talk to a single REST API; the API is the only layer that touches the database and all third-party services. Every request is scoped to the user's organization, so no user can ever reach data that isn't theirs.

```
Client (React web / Android)  ->  REST API (Node/Express, JWT + 2FA)  ->  MySQL
                                        |
                        WhatsApp Cloud API · Mercado Pago · Google OAuth/Calendar · AI
```

## Security (a core differentiator — see `samples/`)
- **Strict per-organization data isolation** — every query is scoped; no cross-tenant access.
- **JWT authentication + optional TOTP 2FA**, constant-time token checks, dedicated session handling.
- **Anti-abuse:** per-IP rate limiting and free-trial caps, email verification, CAPTCHA (Turnstile).
- **Tamper-evident records:** teleconsultation acts sealed with a **SHA-256 hash chain**.
- **Document authenticity:** QR-verifiable PDFs; watermarking on delivered assets.
- Data encryption, controlled access, and **daily encrypted off-site backups**.

## Key production integrations
- **Mercado Pago** — payment links, webhooks, and **marketplace-style split payments** between platform and professionals. → `samples/mercadopago-split.js`
- **WhatsApp Business Cloud API** — an automated scheduling assistant (B-Connect).
- **Google OAuth 2.0 + Calendar** — sign-in and two-way agenda sync.
- **Provider-agnostic integration layer** via the **adapter pattern** (e.g. external prescriptions) to avoid vendor lock-in. → `samples/integration-adapter.js`

## About the samples in this repo
The files under [`samples/`](./samples) are **rewritten, genericized excerpts** that illustrate the patterns above. They intentionally contain **no credentials, no real endpoints, and no patient data**, and are not the exact production code.

## Contact
Gonzalo E. Norry — Full-Stack Developer · Argentina
[bdoctorplatform.com](https://www.bdoctorplatform.com)
