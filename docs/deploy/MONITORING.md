# Monitoring & ops (P2)

## Already in place
- Request logging middleware (`requestId` + method/path/status/duration)
- Health probes: `GET /health` (DB), `GET /health/live`
- Auth rate limits via `@nestjs/throttler`
- Helmet security headers
- Cron leadership via `CRON_ENABLED=false` on replicas

## Recommended next (not required for first careful deploy)
- Wire **Sentry** (or similar) on API + Vite frontend; set `SENTRY_DSN`
- Uptime check on `/health` every 1–5 minutes
- Retain structured logs in your host (Fly/Railway/Render/CloudWatch)
- e2e smoke automation for register → verify → invite → attempt → results

## Product upsides (after deploy is green)
- Archive quiz workflow
- RAG Knowledge Pack authoring UI (HTTP already admin-gated)
- Practice / multi-attempt mode
