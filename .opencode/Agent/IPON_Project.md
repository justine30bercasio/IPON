# IPON PROJECT RULES

## PROJECT

IPON is a multi-organization group savings challenge SaaS for Filipino communities, offices, clubs, and organizations.

The system records real-world savings contributions ("hulog").

Financial correctness and tenant isolation are higher priority than speed of implementation.

---

# NON-NEGOTIABLE RULES

## 1. NEVER GUESS

Before changing code:

* inspect the repository
* search for existing implementations
* inspect Prisma schema
* inspect relevant server actions/API routes
* inspect authorization helpers
* inspect related UI

Never invent files, functions, routes, database fields, or framework behavior.

---

## 2. TENANT ISOLATION

Every organization-owned operation must be organization-scoped.

Never trust organization IDs supplied by clients.

Verify ownership server-side.

A user from Organization A must never access Organization B.

---

## 3. AUTHORIZATION

Do not rely on:

* hidden buttons
* disabled inputs
* frontend route protection

Authorization must be enforced server-side.

---

## 4. FINANCIAL DATA

HulogTransaction is financial data.

Do not casually:

* delete
* overwrite
* alter
* recalculate
* bypass state transitions

Preserve auditability.

---

## 5. TRANSACTION STATES

Current states include:

PENDING
CONFIRMED
VOIDED

Any new state transition must be explicitly reasoned about.

---

## 6. AUDITABILITY

Important financial and administrative actions should retain:

* actor
* timestamp
* affected entity
* action
* relevant before/after information where appropriate

---

## 7. DATABASE

Do not edit generated Prisma files.

Inspect migrations before modifying schema.

Avoid destructive migrations unless explicitly required.

---

## 8. MONEY

Never introduce unsafe floating-point financial calculations.

Use the project's established monetary representation.

---

## 9. DUPLICATES

Consider duplicate requests caused by:

* double-clicks
* browser retries
* network retries
* concurrent requests

Financial mutations should be safe against accidental duplication where appropriate.

---

## 10. TIME

IPON uses schedules and collection periods.

Be careful with:

* timezone
* date boundaries
* month boundaries
* recurring schedules
* custom collection dates

---

## 11. SMALL CHANGES

Prefer the smallest correct change.

Do not refactor unrelated code.

Do not upgrade dependencies unless explicitly requested.

---

## 12. VERIFICATION

After meaningful changes run appropriate:

* type checks
* lint
* tests
* Prisma validation/generation
* production build

Never claim something passed unless it was actually executed.

---

## 13. SPECIALIST REVIEW

For financial changes:

@ipon-finance

For security-sensitive changes:

@ipon-security

For architecture changes:

@ipon-architect

For completed features:

@ipon-verify

For UI changes:

@ipon-uiux

---

# REQUIRED DEVELOPMENT FLOW

For normal features:

UNDERSTAND
→ INSPECT
→ PLAN
→ IMPLEMENT
→ VERIFY

For financial/security-sensitive features:

UNDERSTAND
→ INSPECT
→ IMPLEMENT
→ SPECIALIST REVIEW
→ FIX
→ VERIFY
→ REPORT

---

# AGENT BEHAVIOR

Specialist agents should generally review and report.

IPON-MAIN is responsible for integrating changes.

Do not have multiple agents simultaneously rewrite the same feature.

---

# FAILURE HONESTY

If something cannot be verified:

Say:

NEEDS VERIFICATION

If testing cannot run:

Say:

BLOCKED

Never convert uncertainty into PASS.

---

# DEFINITION OF DONE

A feature is not considered complete merely because code was written.

It should have:

* implementation
* authorization review
* relevant financial/security review
* verification
* documented test result

where applicable.
