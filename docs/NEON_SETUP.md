# Local NextCRM on Neon

This checkout uses project `lively-math-13646011`, branch `production`, database `neondb`.
Postgres and the private `nextcrm-files` bucket are declared/linked through `.neon` and `neon.ts`.

## Environment

`neon deploy` provisions the declared bucket and pulls `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` into `.env`.
Keep both `.env` and `.env.local` untracked. Auth secrets and the testing email are in `.env.local`.
The testing/admin seed email defaults to `mike.newman@timmons.com`; `TEST_USER_EMAIL` overrides it.

Prisma Client, the Postgres adapter, and the Neon adapter use version 7.6.0. The runtime uses
Neon's WebSocket adapter for Neon URLs and the original pg adapter for other Postgres databases.

Normal migration transport is Prisma's direct connection (`DATABASE_URL_UNPOOLED`). This Windows
session resets TLS connections on port 5432; `.env` therefore sets
`NEON_MIGRATION_TRANSPORT=websocket`. The migration wrapper runs the real Prisma CLI through a
loopback bridge to certificate-verified WSS. It does not implement migrations or edit migration
history. Clear that setting to use native direct PostgreSQL on an unrestricted machine.

## Commands (from the repository root)

```powershell
npm run db:migrate:neon
npm run db:seed:neon
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

For local development, use `npm run dev -- --hostname 127.0.0.1 --port 3000`.
The existing `db:migrate`/`db:seed` commands keep their local-database safety guard.
The seed populates lookup/currency/invoice defaults and the active admin test user.
Demo business records remain disabled unless explicitly requested with `SEED_DEMO_DATA=1`.

`npm run verify:neon` performs real disposable CRM-record and private-storage round trips with cleanup.
`scripts/verify-neon-app.ts` also tests sign-in, a protected CRM page, upload CORS, upload/download
routes, anonymous access denial, and cleanup against a running server. It uses the existing
non-production OTP capture endpoint, or an explicitly supplied `NEON_VERIFY_OTP` for a temporary
test login. Never persist `NEXTCRM_TEST_LOGIN_EMAIL` or a fixed OTP on a normal running deployment.
Real inbox OTP delivery requires a configured Resend service/key and sender. Google login needs
Google OAuth credentials; neither is provisioned by Postgres/Object Storage setup.

The build uses Webpack because Turbopack requires junction creation unavailable in this Windows
sandbox. `scripts/windows-fs.cjs` retries transient Windows mkdir errors and recognizes an already
existing directory. It does not grant permissions or disable any type/build checks.
Private stored URLs point to an authenticated app download route; document reads reuse the existing
owner/role/visibility policy. Browser uploads use short-lived presigned PUT URLs.
