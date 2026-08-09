# Admin API collection (demo)

Base URL: `http://localhost:3000`  
Auth: `Authorization: Bearer <access_token>` from `POST /auth/login`

## Auth
- `POST /auth/login` `{ email, password }`
- `POST /auth/forgot-password` `{ email }`
- `POST /auth/reset-password` `{ email, token, password }`
- `GET /auth/me`

## Instructor quiz workspace
- `GET /admin/quizzes`
- `GET /admin/quizzes/:quizId`
- `POST /admin/quizzes/:quizId/invitations/bulk` `{ emails: string[] }`
- `POST /admin/quizzes/:quizId/invitations/:invitationId/resend`
- `GET /admin/quizzes/:quizId/invitations`
- `GET /admin/quizzes/:quizId/attempts`
- `GET /admin/attempts/:attemptId`

## Analytics (single surface)
- `GET /analytics/quiz/:quizId` — funnel metrics + `questions[]`
- `GET /analytics/quiz/:quizId/export.csv`

Legacy `GET /question-analytics/quiz/:quizId` still works; prefer the unified quiz analytics payload.
