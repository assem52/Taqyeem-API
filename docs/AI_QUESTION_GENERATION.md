# AI question generation

How Taqyem turns topics, pasted text, or uploaded files into draft quiz questions for admin review.

## What it does

```
Admin provides topic and/or pasted content and/or PDF/image
        ↓
Server extracts text (PDF parse or image OCR)
        ↓
Groq LLM returns structured question drafts (JSON)
        ↓
Admin reviews / edits in the web UI
        ↓
Selected drafts saved to quiz and/or global question bank
```

Generation is **draft-only**. Nothing is published until an admin saves and (separately) publishes a quiz.

## Endpoint

| Method | Path | Auth |
| :--- | :--- | :--- |
| `POST` | `/admin/ai/generate-questions` | Admin JWT (or dev-only `x-admin-token`) |

Multipart form fields:

| Field | Required | Notes |
| :--- | :--- | :--- |
| `topic` | One of topic / content / source | Max 500 chars |
| `content` | One of topic / content / source | Max 50 000 chars |
| `source` | Optional file | PDF or image (see below) |
| `count` | No | `1`–`15`, default `5` |
| `typePreference` | No | `MCQ` \| `TRUE_FALSE` \| `OPEN_ENDED` \| `MIXED` (default) |

Controller: `src/modules/ai-generate/ai-generate.controller.ts`  
Service: `src/modules/ai-generate/ai-generate.service.ts`

## Document / upload constraints

| Constraint | Value |
| :--- | :--- |
| Supported formats | PDF; PNG, JPG/JPEG, WEBP, GIF |
| Max file size | **8 MB** |
| Text extraction | PDF → text extract; images → OCR then generate from text |
| Max generated questions per request | **15** |

Unsupported MIME types are rejected before generation. Empty extraction (blank PDF / unreadable image) fails with a clear client error.

## AI behavior

### Provider

- **Generation / chat / essay grade / RAG answers:** Groq (`GROQ_API_KEY`, optional `GROQ_MODEL`)
- **Embeddings (RAG ingest only):** OpenAI (`OPENAI_API_KEY`)
- Shared client: `src/modules/ask/llm.service.ts`

API keys stay **server-side only**. The browser never receives provider credentials.

### Prompt construction

- Preference drives mix of MCQ, true/false, and open-ended (`OPEN_ENDED`) items.
- Topic + extracted/pasted content are combined into a generation prompt with an expected JSON schema.
- Difficulty is not a separate API field today; the model is instructed via the fixed prompt for classroom-appropriate items.

### Response handling

- Model output is parsed as structured questions (stem, options, correct answer, explanation / rubric).
- Malformed or incomplete JSON is treated as failure; the client sees an error rather than silent garbage saves.
- Admin UI lets reviewers edit stems/options before persisting.

### Related AI surfaces (not this endpoint)

| Feature | Where |
| :--- | :--- |
| In-app chat | `POST /chat` (hidden on graded attempt screens) |
| Admin RAG ask | `POST /ask` after document ingest |
| Essay AI grading | On attempt submit → `EssayGradingService` → human override via `PATCH /admin/attempts/:id/questions/:qid/grade` |

### Failures & limits

- Missing `GROQ_API_KEY` → explicit configuration error.
- Provider / rate-limit errors → surfaced as failed generation (retry later).
- Uploads larger than 8 MB → Multer / validation rejection.
- Treat uploaded document text as **untrusted data** (possible prompt-injection style content); generation still requires admin review before bank/quiz persistence.

## Admin UX path

1. Open quiz questions or global bank → **Generate with AI**.
2. Choose topic, paste, and/or upload PDF/image; set count and type preference.
3. Review drafts; edit; save selected items.
4. Publish quiz / invite learners separately.

Screenshots: frontend `docs/screenshots/Admin-generate-ai.png`.

## Environment

```env
GROQ_API_KEY=
# GROQ_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=   # only required for RAG ingest/search
```

## Known limitations

- Generation quality depends on source clarity and model availability.
- OCR quality varies by image resolution and language.
- No dedicated page-count hard limit beyond file size and extractable text length.
- Prompt-injection hardening is review-gated, not a full sandbox.
