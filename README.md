# CSE SmartHub: AI-Powered CSE Student Portal

Next.js 14 (App Router) + TypeScript + Tailwind + Prisma/PostgreSQL. Students, faculty and admins manage courses, notices, resources, assignments, projects and a calendar, with an AI study assistant that answers only from documents the signed-in user is allowed to see.

> All seeded people, courses, notices and dates are **fictional demo data**. Nothing here is official academic information, and grades/marks are only ever entered by faculty, never generated.

## Quick start
```bash
npm install
cp .env.example .env            # then set AUTH_SECRET (openssl rand -base64 48)
docker compose up -d            # PostgreSQL 16 on :5432 (or point DATABASE_URL at any Postgres)
npm run db:setup                # creates the initial migration + tables, then seeds demo data
npm run dev                     # http://localhost:3000
```
Demo logins (password `Demo@12345`): `student@smarthub.demo`, `faculty@smarthub.demo`, `admin@smarthub.demo`.

## AI assistant
- **Without `OPENAI_API_KEY`** it runs in clearly labelled *demo mode*: it retrieves the most relevant passages (keyword scoring) and shows them with sources. No answer is generated and the UI says so.
- **With a key** set `OPENAI_API_KEY` in `.env`; new/updated resources are embedded (`text-embedding-3-small`), retrieval uses cosine similarity, and answers/summaries/practice questions are generated (`gpt-4o-mini`) with `[n]` citations.
- If no passage clears the relevance threshold the model is **not called**; the assistant says it found no supporting source.
- Retrieval is filtered by the same access rules as the Resources page (enrolled / teaching / admin / public). Rate limit: 12 requests per minute per user. The key is only used server-side.
- Add AI-searchable content by pasting text when creating a resource, or uploading `.txt` / `.md`. (PDF text extraction is not included; see "Known gaps".)

## Roles and what they can do
| | Student | Faculty | Admin |
|---|---|---|---|
| Browse courses, enrol | yes | | |
| Create courses, assignments, notices, resources, events | | own courses | all |
| Submit assignments | yes | | |
| Review submissions, give feedback/marks | | own courses | all |
| Projects, search, notifications, AI assistant | yes | yes | yes |
| Manage users/roles, departments, audit log | | | yes |

Self-registration always creates a STUDENT. Admins promote users to faculty or admin. Authorization is enforced **on the server** in every server action and route handler (`src/lib/actions.ts`, `src/app/api/*`, `src/lib/access.ts`); middleware is only a first redirect.

## Structure
```
prisma/schema.prisma, seed.ts      16 required models + CalendarEvent, PasswordResetToken
src/lib/actions.ts                 all mutations (Zod-validated, authorized, audited)
src/lib/{auth,session,access}.ts   cookie session (jose JWT, bcrypt), RBAC, visibility rules
src/lib/ai.ts                      chunking, embeddings, retrieval, generation
src/lib/{storage,rate-limit}.ts    upload checks, sliding-window limiter
src/app/(app)/*                    dashboard, courses, notices, resources, assignments, projects,
                                   assistant, calendar, notifications, search, settings, admin
src/app/api/chat, api/files        AI endpoint, permission-checked downloads
tests/ (Vitest), e2e/ (Playwright)
```

## Security notes
Passwords hashed with bcrypt (cost 12); session cookie is httpOnly, SameSite=Lax, Secure in production; login/register/reset/AI rate-limited; password-reset tokens are stored hashed, expire in 30 min and are single-use; uploads are limited to 10 MB, an extension+MIME allow-list, and stored under random names outside the web root, then served only through an authorization check with `nosniff`; deactivated users lose access immediately because the user is re-read from the DB on each request; secrets live only in environment variables.

## Commands
`npm run dev | build | start | typecheck | test | test:e2e | db:migrate | db:deploy | db:seed`
Run `npm run test:e2e` after `npm run db:setup` (the smoke tests at the top don't need a DB; the "seeded demo flow" tests do).

## Deploying to Vercel
1. Create managed PostgreSQL (Neon, Supabase, Vercel Postgres) and set `DATABASE_URL`, `AUTH_SECRET`, optional `OPENAI_API_KEY`.
2. Run `npx prisma migrate deploy` against it, and `npm run db:seed` once if you want demo data.
3. **Replace local-disk uploads** (`src/lib/storage.ts`) with Vercel Blob/S3. Serverless filesystems are ephemeral.
4. Replace the in-memory rate limiter with Upstash/Redis if you run multiple instances.

## Known gaps / next steps
- Password-reset emails: no mail provider is wired in; in development the link is printed to the server console (`forgotPasswordAction`).
- PDF/Office text is not extracted for the AI index. Add a parser (e.g. `pdf-parse`) in `createResourceAction`.
- Embeddings are stored as `Float[]` and compared in application code (fine for thousands of passages). Move to `pgvector` for larger corpora.
- Past AI conversations are saved but there is no history screen yet.
- UI primitives follow shadcn/ui conventions (CVA + tailwind-merge) and are hand-written in `src/components/ui.tsx`; run `npx shadcn@latest init` if you prefer the official generated components.
