/**
 * Smoke checklist for a deployed stack (run manually or against staging).
 *
 * 1) GET /health → 200
 * 2) Bootstrap admin exists; POST /auth/login as ADMIN
 * 3) Create quiz → add question → publish → bulk invite (copy link if simulated)
 * 4) Register learner → verify (email or log token) → accept invite → start → submit → results
 * 5) Admin follow-up + outcomes CSV with Bearer token
 * 6) Confirm x-student-id without JWT returns 401 in production
 * 7) Confirm /ingestion without admin auth returns 401/403
 */
console.log('See docs/deploy/DEPLOY.md — smoke steps listed in scripts/smoke-checklist.md comments.');
