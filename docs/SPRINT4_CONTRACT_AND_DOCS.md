# Sprint 4 Technical Documentation & Integration Handover

**Domain**: Quiz Administration, Invitations & Invitation Email  
**Lead Engineer**: Osama  
**Target Recipient**: Mohamed Haitham & Development Team  

---

## 1. Executive Overview

Sprint 4 establishes the core **Quiz Management**, **Invitation Lifecycle State Machine**, and **Resilient Bulk Invitation Engine**. It enforces domain boundaries between quiz configuration, invitation delivery, and question/integrity services.

---

## 2. Shared Module Contracts & Schema

### **Quiz Model**
```prisma
model Quiz {
  id                 String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title              String
  description        String?
  createdAt          DateTime     @default(now()) @map("created_at")
  openDate           DateTime     @default(now()) @map("open_date")
  duration           Int          @default(60)
  closesAt           DateTime     @map("close_at")
  passScore          Decimal?     @map("pass_score") @db.Decimal(5, 2)
  status             QuizStatus   @default(DRAFT)
  integrityThreshold Int          @default(5) @map("integrity_threshold")
  questions          Question[]
  enrollments        Enrollment[]
  invitations        Invitation[]
  attempts           Attempt[]
}
```

### **Invitation & EmailLog Models**
```prisma
model Invitation {
  id        String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  quizId    String     @db.Uuid
  email     String
  invitedAt DateTime   @default(now()) @map("invited_at")
  emailLogs EmailLog[]

  @@index([quizId, email])
}

model EmailLog {
  id           String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invitationId String         @db.Uuid
  status       EmailLogStatus @default(SENT)
  occurredAt   DateTime       @default(now()) @map("occurred_at")
  errorMessage String?        @map("error_message")

  @@index([invitationId])
}
```

---

## 3. State Machines & Lifecycle Rules

### **A. Quiz Status State Machine**
- **Statuses**: `DRAFT` ➔ `PUBLISHED` (or reverted to `DRAFT`).
- **Publish Gate**:
  - Gated on `validateQuiz()` from `src/modules/questions/validate-quiz.ts`.
  - Quiz must contain at least 1 non-hidden question, all MCQ/True-False questions must have a valid correct option marked, and text must not be empty.
- **Attempt Lock Safeguard**:
  - If student attempts (`attemptCount > 0`) exist for a quiz, structural parameters (`openDate`, `closesAt`, `duration`, `passScore`) are locked against modification. Only `title` and `description` edits are allowed.

### **B. Invitation Status State Machine**
Computed dynamically from DB facts (`EmailLog`, `Enrollment`, `Attempt`):
- **`Sent`**: Email log recorded `SENT` status within the active pending window (48 hours).
- **`Failed`**: Most recent email dispatch returned `FAILED` status.
- **`Accepted`**: Student registered/enrolled with matching email.
- **`Started`**: Student has initiated an attempt (`AttemptStatus.IN_PROGRESS`).
- **`Submitted`**: Student completed and submitted attempt (`AttemptStatus.SUBMITTED` / `AUTO_SUBMITTED`).
- **`Not Started`**: Invited but no matching enrollment/attempt activity recorded yet.

---

## 4. API Endpoints Reference

### **Quiz Management APIs**
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/quizzes` | List quizzes with `?search=` and `?status=DRAFT\|PUBLISHED` | `AdminGuard` |
| `POST` | `/admin/quizzes` | Create a new quiz (`DRAFT` state by default) | `AdminGuard` |
| `GET` | `/admin/quizzes/:id` | Fetch quiz detail with questions and attempt lock info | `AdminGuard` |
| `PATCH` | `/admin/quizzes/:id` | Update quiz fields (subject to attempt lock) | `AdminGuard` |
| `PATCH` | `/admin/quizzes/:id/publish` | Validate questions & set status to `PUBLISHED` | `AdminGuard` |
| `PATCH` | `/admin/quizzes/:id/unpublish` | Revert status back to `DRAFT` | `AdminGuard` |
| `DELETE` | `/admin/quizzes/:id` | Delete quiz (blocked if student attempts exist) | `AdminGuard` |

### **Invitation APIs**
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/quizzes/:id/invitations` | Get invitation lifecycle list & breakdown summary | `AdminGuard` |
| `POST` | `/admin/quizzes/:id/invitations/bulk` | Resilient bulk invitation dispatch | `AdminGuard` |

---

## 5. Resilient Bulk Invite Error Contract

### Payload Input:
```json
{
  "emails": [
    "alice@example.com",
    "invalid-email-string",
    "alice@example.com",
    "charlie@example.com"
  ]
}
```

### Response Breakdown (HTTP 200 OK):
```json
{
  "quizId": "22222222-2222-2222-2222-222222222222",
  "total": 4,
  "sent": 2,
  "failed": 0,
  "duplicates": 1,
  "invalid": 1,
  "results": [
    { "email": "alice@example.com", "status": "SENT" },
    { "email": "invalid-email-string", "status": "INVALID", "reason": "Invalid email address format" },
    { "email": "alice@example.com", "status": "DUPLICATE", "reason": "Student has already been invited to this quiz" },
    { "email": "charlie@example.com", "status": "SENT" }
  ]
}
```
*Key Guarantee*: Individual recipient errors (syntax errors, duplicate invitations, SMTP dispatch failures) are caught per row and isolated, ensuring the remaining batch executes successfully.
