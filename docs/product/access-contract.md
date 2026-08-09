# Access contract

1. Invitation token = `Invitation.id`. Public link: `/invite/{invitationId}`.
2. Admin UI must always offer **Copy invite link**, even when email is simulated.
3. Email body (live or simulated log) must include the invite URL.
4. On **register** or **verify**, if the user’s email matches pending invitations, create missing `Enrollment` rows automatically.
5. Bulk invite should target **PUBLISHED** quizzes (block or hard-warn on drafts).
6. Accept invite still works for logged-in students (idempotent enrollment).
7. Students never see DRAFT quizzes on the dashboard.
