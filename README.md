# IPON — Group Savings Challenge Platform

**IPON** (a Filipino term for saving / setting aside money) is a multi-organization web
platform that digitizes the traditional *hulog* — the Philippines&apos; habit of regular
group savings contributions. Clubs, offices, and communities can run savings challenges,
track every contribution, and stay accountable.

Live: https://ipon-inky.vercel.app

---

## What this system does

### Core loop
1. An **organizer** (admin) creates an **IPON Challenge** — e.g. *"ICDeC Coworker IPON 2026"* —
   with a contribution schedule (monthly, twice a month, weekly, every 2 weeks, custom dates,
   or flexible).
2. The organizer adds **members** to the challenge.
3. On each collection period, members (or the organizer on their behalf) **record a hulog**
   (a contribution) with an amount, date, payment method (cash / GCash / bank transfer / other),
   and optional note.
4. Transactions start as **pending** and are **confirmed** by an organizer (or auto-confirmed
   for member-submitted ones if the challenge allows it).
5. Everyone sees progress: totals, this-month activity, monthly charts, calendars, reports,
   and (optionally) a **leaderboard**.

### Key features
- **Multi-organization tenancy** — every user, challenge, and transaction belongs to an
  organization. Organizations are fully isolated; nothing crosses org boundaries.
- **Super Admin panel** — the platform owner can create/rename organizations, provision org
  admins, bulk-add members, and create challenges inside *any* organization from one panel.
- **Org switcher** — super admins can switch which organization they&apos;re managing directly
  on the Members page.
- **Roles** — `SUPER_ADMIN` (platform owner), `ADMIN` (organizer of one org), `MEMBER`.
- **Challenge settings** — privacy levels (`private` / `group totals` / `transparent`),
  leaderboard toggle, and whether members may record their own hulog.
- **Member management** — bulk create accounts, edit profiles, reset passwords, promote/demote
  admin roles, deactivate, and permanently delete users.
- **Financial recording** — record/confirm/void transactions, filter by month or member,
  member contribution cards, per-challenge reports.
- **Contribution calendar** — visual calendar of collection dates per challenge.
- **Reports & export** — aggregated reports with **Excel export**.
- **Notifications & activity feed** — in-app notifications plus an activity log of who did what.
- **Auth** — email/username login, registration, password reset flow (email or token),
  rate-limited auth endpoints, remember-me sessions, and a super-admin identity enforced by
  an env-configured email (`SUPER_ADMIN_EMAIL`).

### Pages
| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/login` `/register` `/forgot-password` | Auth |
| `/dashboard` | Personal/admin overview: stats, monthly chart, your challenges, recent hulog |
| `/challenges` | Challenge list (per-org) |
| `/challenges/new` | Create a challenge (admins; super admins can pick the org) |
| `/challenges/[id]` | Challenge home: overview, members, schedule |
| `/challenges/[id]/calendar` | Contribution calendar |
| `/challenges/[id]/members` | Challenge-specific member management |
| `/challenges/[id]/transactions` | Transaction history |
| `/challenges/[id]/reports` | Reports + Excel export |
| `/challenges/[id]/settings` | Challenge settings & deletion |
| `/members` | Org-wide member management (with org switcher for super admins) |
| `/hulog` | The full hulog history |
| `/activity` | Activity feed |
| `/notifications` | In-app notifications |
| `/profile` | Profile editing + password change |
| `/admin` | Super admin: organizations, create/rename orgs |
| `/admin/organizations/[id]` | Org detail: users, challenges, add members, create challenge/admin |

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16** (App Router, React 19, TypeScript) |
| UI | **Tailwind CSS v4**, custom `lucide-react` icons, **Recharts** for charts |
| Database | **PostgreSQL** (via **Neon** serverless) |
| ORM | **Prisma 7** with `@prisma/adapter-pg` driver adapter |
| Auth | Custom session auth (JWT via **jose**), `bcryptjs` password hashing, edge-aware rate limiting |
| Excel export | **exceljs** |
| Deployment | **Vercel** (production + preview), **Neon** for the managed Postgres |
| Tooling | ESLint, TypeScript, `tsx` for scripts, `prisma migrate deploy` on build |

---

## Architecture

### App layout (Next.js App Router)
- `src/app` — routes (server components) and API routes under `src/app/api`.
- `src/components` — client components (forms, modals, tables, charts) and a reusable
  `ui/` primitives kit (button, input, card, badge, modal, toast, table pagination, etc.).
- `src/lib` — core business logic:
  - `prisma.ts` — Prisma client singleton (PG driver adapter, runtime URL).
  - `auth.ts` — session creation/validation, role checks, super-admin resolution.
  - `actions.ts` — all server actions (challenges, members, hulog, orgs, admin).
  - `queries.ts` — read-model helpers (stats, overviews, series).
  - `challenge-context.ts` — per-challenge visibility & permission helpers.
  - `period.ts` — collection-period math from schedules.
  - `format.ts`, `rate-limit.ts` — formatting and auth rate limiting.

### Data model (Prisma)
- **Organization** — top-level tenant; owns users and challenges.
- **User** — belongs to one org; role `SUPER_ADMIN | ADMIN | MEMBER`.
- **Challenge** — belongs to an org; status, visibility, leaderboard, member-hulog flags.
- **ChallengeSchedule** — contribution cadence (`frequency` + day-of-month/day-of-week/custom dates).
- **ChallengeMember** — many-to-many link with membership status and challenge admin flag.
- **HulogTransaction** — the recorded contribution; amount, date, collection period, payment
  method, `PENDING → CONFIRMED / VOIDED`, recorder & confirmer audit trail.
- **Notification / ActivityLog / PasswordReset** — engagement, audit, and recovery support.

### Permission model
- All data reads and writes are org-scoped. Non-super admins can only touch rows where
  `orgId === user.orgId` (enforced inside `actions.ts` helpers like `hasOrgAccess`).
- Super admins may operate across **all** organizations; super-admin user records are locked
  against edits/deactivation from the UI.
- Challenge-level visibility (`PRIVATE` / `GROUP_TOTALS` / `TRANSPARENT`) is enforced in
  `challenge-context.ts`.

### Deployment & database migrations
- Pushing to `main` triggers a Vercel production build.
- The build runs `prisma migrate deploy && prisma generate && next build`, so migrations are
  applied against the Neon `DATABASE_URL` before the app ships. Do not run migrations manually
  against production.
- `SUPER_ADMIN_EMAIL` is configured in Vercel&apos;s production environment so the owning account
  is always promoted to `SUPER_ADMIN` at sign-in.

---

## Getting started (local development)

Requirements: Node.js 20+, a PostgreSQL database (or Neon connection string).

```bash
npm install
```

Set environment variables (`.env.local`):

```env
DATABASE_URL="postgresql://<user>:<pass>@<host>/<db>?sslmode=require"
AUTH_SECRET="<random long secret>"
SUPER_ADMIN_EMAIL="you@example.com"   # optional — which account becomes Super Admin
```

Then run:

```bash
npx prisma migrate deploy      # apply schema
npx prisma generate            # generate the client
npm run dev                    # start the dev server
```

Open http://localhost:3000

### Production build

```bash
npm run build && npm start
```

---

## Repo guidance

- `AGENTS.md` is maintained by the dev toolchain — keep code changes comment-free when adding
  them, and don&apos;t remove the file.
- `prisma/ipon2026.json`, `scripts/import-ipon2026.ts`, and similar local import/seed scratch
  files are gitignored.
- The `next` package is a fork with breaking changes relative to public Next.js docs; consult
  `node_modules/next/dist/docs/` before changing framework-level code.