# Taqyem deploy runbook

## Prerequisites
- Postgres with **pgvector** (`CREATE EXTENSION vector;`)
- API always-on process (cron sweeps attempts every minute)
- Frontend static host or nginx with SPA fallback

## Backend
1. Set secrets from `.env.example` (`JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, SMTP if live email).
2. `npm ci && npx prisma migrate deploy && npm run build && npm run start:prod`
3. Bootstrap first admin (once):
   ```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='ChangeMeNow1' ADMIN_NAME='You' \
     npx ts-node scripts/bootstrap-admin.ts
   ```
4. Health: `GET /health` and `GET /health/live`
5. Multi-replica: set `CRON_ENABLED=false` on all but one API instance.

## Frontend
1. Build with **required** `VITE_API_BASE_URL=https://api.example.com`
2. Do **not** set `VITE_MOCK_STUDENT_ID` or `VITE_ADMIN_TOKEN` in production builds.
3. Serve `dist/` with SPA fallback (`nginx.conf` or `public/_redirects`).

## Docker (optional)
```bash
# API
docker build -t taqyem-api ./backend
docker run --env-file backend/.env -p 3000:3000 taqyem-api

# Web
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t taqyem-web ./frontend
docker run -p 8080:80 taqyem-web
```

## Email modes
- No `SMTP_HOST`: simulated — invites still get copyable links; verify/reset tokens appear in API logs.
- With `SMTP_HOST` (+ auth): live nodemailer delivery for invites, verify, and reset.

## Never in production
- `npx prisma db seed` (destructive wipe)
- `MOCK_STUDENT_ID` / `x-student-id` impersonation
- `x-admin-token` shared secret

## Related
- [Smoke checklist](../demo/smoke-checklist.md)
- [Known issues](../demo/known-issues.md)
- [Monitoring](./MONITORING.md)
