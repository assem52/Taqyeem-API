# Student APIs Documentation

## Scope

This document provides a comprehensive API Audit and Documentation for the **Student Entry Experience** and **Student Quiz Solving & Resume UX**.

### Task Scope
- **Student Entry Experience**:
  - Dashboard listing only accessible/invited quizzes for the current student.
  - Quiz details & instructions screen.
  - Invitation link handling to open the target quiz.
  - Friendly invalid, restricted, and closed states.
- **Solving and Resume UX**:
  - Start/retrieve attempts.
  - Question rendering and answer input controls.
  - Continuous answer saving.
  - Resuming in-progress attempt after disconnect or browser refresh.
  - Single submission protection.
  - Invitation state update upon acceptance.

---

## API Ownership

| Area | Owner | Description |
| :--- | :--- | :--- |
| **Student-facing Journey** | **Learner 4** | Dashboard listing, gateway, instructions, UI state management, and route protection guards. |
| **Invitation Records** | **Learner 2** | Invitation record creation, invitation token lookup, invitation email validation, and student enrollment creation. |
| **Attempts & Scoring** | **Learner 5** | Attempt creation/retrieval, question snapshot, continuous answer persistence, auto-submission, scoring, and score event publishing. |

---

## 1. Student Dashboard APIs

### Endpoint: `GET /student/quizzes`
- **Owner**: Learner 4
- **Task**: Dashboard
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**: None (Student ID is derived server-side from JWT payload).
- **Request Body**: N/A
- **Response Structure**:
  ```json
  {
    "quizzes": [
      {
        "quizId": "b3f2e1a0-1234-4567-89ab-cdef01234567",
        "title": "Sample Quiz Title",
        "description": "Quiz description text",
        "instructions": "Quiz instructions or rules text",
        "durationMinutes": 60,
        "opensAt": "2026-08-01T00:00:00.000Z",
        "closesAt": "2026-08-31T23:59:59.000Z",
        "score": 8.5,
        "studentState": "Not started" | "In progress" | "Submitted" | "Closed",
        "canStart": true,
        "blockedReason": null | "This quiz has closed." | "Your email address is unverified."
      }
    ],
    "message": null | "You don't have any quizzes yet. Check back after you've been invited to one."
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Token missing, invalid, or expired.
  - `404 Not Found`: Student profile not found for authenticated user.
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useGetStudentQuizzesQuery()`
  - **Component**: `src/features/studentQuizzes/components/QuizzesList.jsx` inside `DashboardPage.jsx`.

---

## 2. Quiz Access & Instructions APIs

### Endpoint: `GET /student/quizzes/:quizId`
- **Owner**: Learner 4
- **Task**: Quiz Instructions & Access Check
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**:
  - `quizId` (Path Parameter, String UUID): Unique identifier of the target quiz.
- **Request Body**: N/A
- **Response Structure**:
  ```json
  {
    "quizId": "b3f2e1a0-1234-4567-89ab-cdef01234567",
    "title": "Sample Quiz Title",
    "description": "Quiz description text",
    "instructions": "Detailed instructions and guidelines...",
    "durationMinutes": 60,
    "opensAt": "2026-08-01T00:00:00.000Z",
    "closesAt": "2026-08-31T23:59:59.000Z",
    "score": null,
    "studentState": "Not started" | "In progress" | "Submitted" | "Closed",
    "canStart": true,
    "blockedReason": null
  }
  ```
- **Error Responses**:
  - `400 Bad Request` / `404 Not Found`: `"This quiz link is invalid."` (Quiz does not exist or status is not `PUBLISHED`).
  - `403 Forbidden`: `"You have not been invited to this quiz."` (Student is not enrolled).
  - `401 Unauthorized`: Session expired or unauthenticated.
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useGetStudentQuizQuery(quizId)`
  - **Component**: `src/features/studentQuizzes/pages/QuizGatewayPage.jsx`.

---

## 3. Invitation APIs

### Endpoint: `GET /student/invitations/:token`
- **Owner**: Learner 2
- **Task**: Invitation Lookup & Public Preview
- **Authentication**: Public Endpoint (No Authentication Required).
- **Parameters**:
  - `token` (Path Parameter, String UUID): Unique invitation token ID.
- **Request Body**: N/A
- **Response Structure**:
  ```json
  {
    "quizId": "b3f2e1a0-1234-4567-89ab-cdef01234567",
    "title": "Quiz Title",
    "description": "Quiz description text",
    "instructions": "Instructions...",
    "durationMinutes": 60,
    "opensAt": "2026-08-01T00:00:00.000Z",
    "closesAt": "2026-08-31T23:59:59.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `"Invalid invitation token format."` or `"This quiz has closed."`
  - `404 Not Found`: `"Invitation token is invalid or expired."` or `"This quiz link is invalid or unavailable."`
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useGetInvitationQuery(token)`
  - **Component**: `src/features/studentQuizzes/pages/InvitationPage.jsx`.

---

### Endpoint: `POST /student/invitations/:token/accept`
- **Owner**: Learner 2
- **Task**: Accept Invitation & Create Enrollment
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**:
  - `token` (Path Parameter, String UUID): Invitation token ID.
- **Request Body**: N/A
- **Response Structure**:
  ```json
  {
    "quizId": "b3f2e1a0-1234-4567-89ab-cdef01234567",
    "enrolled": true,
    "message": "Invitation accepted. You are enrolled in this quiz."
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: `"This invitation was sent to a different email address."`
  - `404 Not Found`: `"Student profile not found."` or `"Invitation token is invalid or expired."`
  - `400 Bad Request`: `"This quiz has closed."`
- **Frontend Usage**:
  - **File**: `src/features/auth/authApi.js`
  - **Hook**: `useAcceptInvitationMutation()`
  - **Component**: `src/features/studentQuizzes/pages/InvitationPage.jsx`.

---

## 4. Attempt APIs

### Endpoint: `POST /attempts`
- **Owner**: Learner 5
- **Task**: Start / Retrieve In-Progress Attempt
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**: None.
- **Request Body**:
  ```json
  {
    "quizId": "b3f2e1a0-1234-4567-89ab-cdef01234567"
  }
  ```
- **Response Structure**:
  ```json
  {
    "attemptId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "IN_PROGRESS"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `"quizId is required."`
  - `403 Forbidden`: `"You have not been invited to this quiz."` or `"This quiz cannot be started right now."`
  - `404 Not Found`: `"Student not found"` or `"This quiz link is invalid."`
  - `409 Conflict`: `"You have already submitted this quiz."`
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useStartAttemptMutation()`
  - **Component**: `src/features/studentQuizzes/pages/QuizGatewayPage.jsx`.

---

## 5. Question & Answer APIs

### Endpoint: `GET /student/quizzes/:quizId/attempt`
- **Owner**: Learner 5 (Data delivery via Learner 4 router prefix)
- **Task**: Fetch Attempt Questions & Saved Answers
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**:
  - `quizId` (Path Parameter, String UUID): Unique quiz identifier.
- **Request Body**: N/A
- **Response Structure**:
  ```json
  {
    "id": "attempt-uuid",
    "quizId": "quiz-uuid",
    "studentId": "student-uuid",
    "status": "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED",
    "startedAt": "2026-08-08T12:00:00.000Z",
    "submittedAt": null | "2026-08-08T12:30:00.000Z",
    "score": null | 10,
    "attemptAnswers": {
      "question-uuid-1": {
        "selectedOptionId": "option-uuid-1",
        "answeredAt": "2026-08-08T12:05:00.000Z"
      }
    },
    "questions": [
      {
        "id": "question-uuid-1",
        "text": "What is 2 + 2?",
        "type": "MCQ" | "TRUE_FALSE" | "OPEN_ENDED",
        "options": [
          { "id": "opt-1", "option": "3" },
          { "id": "opt-2", "option": "4" }
        ]
      }
    ]
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `"Attempt not found"` or `"Student not found"`.
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useGetAttemptQuery(quizId)`
  - **Component**: `src/features/studentQuizzes/pages/QuizAttemptPage.jsx`.

---

### Endpoint: `PUT /attempts/:attemptId/answers/:questionId`
- **Owner**: Learner 5
- **Task**: Save Individual Answer Choice / Text Continuously
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**:
  - `attemptId` (Path Parameter, String UUID): Attempt ID.
  - `questionId` (Path Parameter, String UUID): Target Question ID.
- **Request Body**:
  ```json
  {
    "selectedOptionId": "option-uuid-or-text-value"
  }
  ```
- **Response Structure**:
  ```json
  {
    "saved": true
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: `"Not authorized to access this attempt"`
  - `404 Not Found`: `"Attempt not found"`
  - `409 Conflict`: `"Cannot change answers after submission"`
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useSaveAnswerMutation()`
  - **Component**: `src/features/studentQuizzes/pages/QuizAttemptPage.jsx`.

---

## 6. Resume APIs

Resuming an attempt relies on the combination of:
1. `POST /attempts`: Returns the existing `attemptId` if `status === 'IN_PROGRESS'`.
2. `GET /student/quizzes/:quizId/attempt`: Delivers the persisted `attemptAnswers` JSON object and question snapshot to restore state after page refresh or network reconnect.

---

## 7. Submission APIs

### Endpoint: `POST /attempts/:attemptId/submit`
- **Owner**: Learner 5
- **Task**: Submit Attempt & Calculate Score
- **Authentication**: Requires JWT Access Token (`Authorization: Bearer <jwtToken>`). Guarded by `StudentAuthGuard`.
- **Parameters**:
  - `attemptId` (Path Parameter, String UUID): Attempt ID to submit.
- **Request Body**: N/A
- **Response Structure**:
  ```json
  {
    "score": {
      "score": 10,
      "maxScore": 10,
      "passed": true
    }
  }
  ```
- **Error Responses**:
  - `503 Service Unavailable`: Transaction timeout during auto-submit / score calculation.
- **Duplicate Submission Handling**:
  - Atomic database transaction claims the attempt (`UPDATE "Attempt" SET status = 'SUBMITTED' WHERE status = 'IN_PROGRESS'`).
  - If a second submission is attempted, backend reads the previously scored result and returns it safely without failing or duplicating scores.
- **Frontend Usage**:
  - **File**: `src/features/studentQuizzes/studentQuizzesApi.js`
  - **Hook**: `useSubmitAttemptMutation()`
  - **Component**: `src/features/studentQuizzes/pages/QuizAttemptPage.jsx`.

---

## 8. Notification / Invitation State APIs

### Handled State Transitions:
1. **Invitation Accepted**: Handled by `POST /student/invitations/:token/accept` which creates an `Enrollment` record.
2. **Score Published Event**: Handled server-side by `ScoreEventsService.publish()` which emits `slot1.quiz.attempt.scored` and `slot5.quiz.attempt.scored` events upon submission.

---

## 9. Complete Student Flow

```text
User Registration / Login
  │
  ├─► [POST /auth/register] -> status: 'UNVERIFIED'
  ├─► [POST /auth/login] -> returns { access_token, status }
  │
  ▼
Email Verification Guard Check
  │
  ├─► status === 'UNVERIFIED' ──► Redirect to [/verify-email]
  │                                 ├─► [POST /auth/resend-verification]
  │                                 └─► [POST /auth/verify]
  │
  └─► status === 'VERIFIED'
        │
        ▼
Student Dashboard [/]
  │
  ├─► [GET /student/quizzes] (Learner 4)
  │     └─► Renders list of enrolled, published quizzes
  │
  ▼
Invitation Link Handling [/invite/:token]
  │
  ├─► [GET /student/invitations/:token] (Learner 2 Public Preview)
  └─► [POST /student/invitations/:token/accept] (Learner 2 Accept & Enroll)
        │
        ▼
Quiz Gateway & Instructions [/quizzes/:quizId]
  │
  ├─► [GET /student/quizzes/:quizId] (Learner 4 Quiz Details & Instructions)
  │
  ▼ User clicks "Begin Assessment"
Start / Resume Attempt
  │
  ├─► [POST /attempts] (Learner 5) -> returns { attemptId, status: 'IN_PROGRESS' }
  │
  ▼ Navigate to Quiz Attempt [/quizzes/:quizId/attempt]
Load Questions & Resume State
  │
  ├─► [GET /student/quizzes/:quizId/attempt] (Learner 5 Question Snapshot & Saved Answers)
  │
  ▼ Student solves questions
Continuous Answer Persistence
  │
  ├─► [PUT /attempts/:attemptId/answers/:questionId] (Learner 5 Debounced Save)
  │
  ▼ Browser Refresh / Reconnect Scenario
Resume State Check
  │
  ├─► [GET /student/quizzes/:quizId/attempt] -> Hydrates saved answers to UI
  │
  ▼ Student completes quiz
Submit Attempt
  │
  ├─► [POST /attempts/:attemptId/submit] (Learner 5 Atomic Submission & Event Publication)
  │
  ▼ Final Result Screen
Displays score & submission confirmation
```

---

## 10. Acceptance Criteria Mapping

| Acceptance Criterion | API Endpoint | Owner | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Student sees only allowed quizzes** | `GET /student/quizzes` | Learner 4 | **PASS** | `StudentQuizzesService.getDashboard()` filters by `studentId` and `quiz.status == 'PUBLISHED'`. |
| **Instructions appear before attempt** | `GET /student/quizzes/:quizId` | Learner 4 | **PASS** | `QuizGatewayPage.jsx` renders instructions before student clicks "Begin Assessment" (`POST /attempts`). |
| **Invalid links never show technical error** | `GET /student/quizzes/:quizId` & `GET /student/invitations/:token` | Learner 4 / Learner 2 | **PASS** | `QuizGatewayPage.jsx` and `InvitationPage.jsx` render friendly `<MessagePage>`, `<AccessDenied>`, or `<QuizClosed>` UI. |
| **Student completes quiz end-to-end** | `POST /attempts` & `POST /attempts/:attemptId/submit` | Learner 5 | **PASS** | End-to-end integration verified in `student-quizzes.attempt.spec.ts`. |
| **Saved answers survive reconnect** | `PUT /attempts/:attemptId/answers/:questionId` & `GET /student/quizzes/:quizId/attempt` | Learner 5 | **PASS** | Answers saved to DB JSONB & `Answer` table; hydrated on `GET /student/quizzes/:quizId/attempt`. |
| **Duplicate submission is prevented** | `POST /attempts/:attemptId/submit` | Learner 5 | **PASS** | Atomic SQL update `SET status = 'SUBMITTED' WHERE status = 'IN_PROGRESS'`. |

---

## 11. Missing / Unimplemented APIs

None. All required endpoints for Student Entry, Gateway Instructions, Invitation Lookup/Acceptance, Attempt Creation, Question Snapshot, Continuous Saving, Resume, and Single Submission exist and are fully integrated.

---

## 12. Frontend Integration Map

| API Endpoint | Backend Controller File | Frontend API Hook | Frontend Page / Component | Owner | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /student/quizzes` | `StudentQuizzesController` | `useGetStudentQuizzesQuery` | `QuizzesList.jsx` / `DashboardPage.jsx` | Learner 4 | Student Dashboard list |
| `GET /student/quizzes/:quizId` | `StudentQuizzesController` | `useGetStudentQuizQuery` | `QuizGatewayPage.jsx` | Learner 4 | Quiz Gateway & Instructions |
| `GET /student/invitations/:token` | `StudentInvitationsController` | `useGetInvitationQuery` | `InvitationPage.jsx` | Learner 2 | Invitation Token Preview |
| `POST /student/invitations/:token/accept` | `StudentInvitationsController` | `useAcceptInvitationMutation` | `InvitationPage.jsx` | Learner 2 | Accept Invitation & Enroll |
| `POST /attempts` | `AttemptController` | `useStartAttemptMutation` | `QuizGatewayPage.jsx` | Learner 5 | Start / Resume Attempt |
| `GET /student/quizzes/:quizId/attempt` | `StudentQuizzesController` | `useGetAttemptQuery` | `QuizAttemptPage.jsx` | Learner 5 | Get Attempt & Questions |
| `PUT /attempts/:attemptId/answers/:questionId` | `AttemptController` | `useSaveAnswerMutation` | `QuizAttemptPage.jsx` | Learner 5 | Save Answer Choice/Text |
| `POST /attempts/:attemptId/submit` | `AttemptController` | `useSubmitAttemptMutation` | `QuizAttemptPage.jsx` | Learner 5 | Submit Attempt |

---

## 13. Security Notes

1. **Student Authorization & Enrollment Enforcement**:
   - `GET /student/quizzes` derives `studentId` from the verified JWT payload (`@CurrentUser('studentId')`). Students cannot pass another student's ID in the request.
   - `GET /student/quizzes/:quizId` checks if an `Enrollment` row exists for `(quizId, studentId)`. If not, returns `403 Forbidden` (`"You have not been invited to this quiz."`).
   - If Student A attempts to access Quiz B assigned to Student B, `StudentQuizzesService` throws `ForbiddenException`.

2. **Invitation Email Match Guard**:
   - `POST /student/invitations/:token/accept` verifies that `student.email` matches `invitation.email` (case-insensitive). If a logged-in student attempts to redeem an invitation sent to a different email address, backend throws `403 Forbidden` (`"This invitation was sent to a different email address."`).

3. **Attempt & Submission Concurrency Protection**:
   - `POST /attempts` uses a database transaction and unique constraint on `(quizId, studentId)` to prevent duplicate active attempts.
   - `POST /attempts/:attemptId/submit` uses an atomic `UPDATE` with `WHERE status = 'IN_PROGRESS'` to ensure an attempt can be submitted and scored exactly once.
