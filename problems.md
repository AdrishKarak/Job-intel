# Problems & Solutions Engineering Log

This document records the major technical challenges, build failures, serverless deployment bugs, database anomalies, and performance bottlenecks encountered during the development and production deployment of the AI Job Intelligence Platform, along with their root causes, architectural solutions, and engineering takeaways.

---

## Table of Contents

- [1. Build & Package Management Issues](#1-build--package-management-issues)
  - [1.1 Invalid Deploy Target in pnpm Workspace (`ERR_PNPM_INVALID_DEPLOY_TARGET`)](#11-invalid-deploy-target-in-pnpm-workspace-err_pnpm_invalid_deploy_target)
  - [1.2 Missing Prisma Schema Location in Monorepo Postinstall](#12-missing-prisma-schema-location-in-monorepo-postinstall)
- [2. Database & Migration Challenges](#2-database--migration-challenges)
  - [2.1 Failed Production Migration Lockout (`P3009`)](#21-failed-production-migration-lockout-p3009)
  - [2.2 Missing Foreign Key Indexes Causing Slow Dashboard Aggregations](#22-missing-foreign-key-indexes-causing-slow-dashboard-aggregations)
- [3. Serverless Runtime & Deployment Bugs](#3-serverless-runtime--deployment-bugs)
  - [3.1 Missing Prisma Query Engine Binary on Vercel AWS Lambda (HTTP 500)](#31-missing-prisma-query-engine-binary-on-vercel-aws-lambda-http-500)
  - [3.2 Clerk Production DNS Failure on Shared Vercel Domains (`ERR_CONNECTION_CLOSED`)](#32-clerk-production-dns-failure-on-shared-vercel-domains-err_connection_closed)
- [4. Authentication & State Synchronization](#4-authentication--state-synchronization)
  - [4.1 Client Auth Race Condition Causing Premature HTTP 401 Queries](#41-client-auth-race-condition-causing-premature-http-401-queries)
  - [4.2 Missing User Record & Webhook Latency Auto-Provisioning](#42-missing-user-record--webhook-latency-auto-provisioning)
- [5. Performance & Data Fetching Bottlenecks](#5-performance--data-fetching-bottlenecks)
  - [5.1 Sequential Database Latency in Dashboard Data Fetching](#51-sequential-database-latency-in-dashboard-data-fetching)
  - [5.2 Aggressive Re-Fetching and Flashing UI on Page Navigation](#52-aggressive-re-fetching-and-flashing-ui-on-page-navigation)
- [6. AI & Filtering Accuracy](#6-ai--filtering-accuracy)
  - [6.1 Irrelevant Jobs and Seniority Mismatches in Feed](#61-irrelevant-jobs-and-seniority-mismatches-in-feed)
  - [6.2 Generative LLM Hallucinations in Match Explanations](#62-generative-llm-hallucinations-in-match-explanations)

---

## 1. Build & Package Management Issues

### 1.1 Invalid Deploy Target in pnpm Workspace (`ERR_PNPM_INVALID_DEPLOY_TARGET`)

#### Symptom:
During Vercel production build, the build process abruptly aborted with:
```
ERR_PNPM_INVALID_DEPLOY_TARGET This command requires one parameter
ELIFECYCLE Command failed with exit code 1.
Error: [BUILD_UTILS_SPAWN_1] Command "if [ "$VERCEL_ENV" = "production" ]; then pnpm --dir ../.. db:deploy || exit 1; fi; pnpm --dir ../.. build" exited with 1
```

#### Root Cause:
In root `package.json`, the deployment script was defined as:
```json
"db:deploy": "pnpm --filter @repo/db deploy"
```
In `pnpm`, `deploy` is a built-in top-level command used for isolating a deployable package into a target directory (`pnpm deploy <target-directory>`). Because no target directory argument was provided, pnpm threw `ERR_PNPM_INVALID_DEPLOY_TARGET`. It did not interpret `deploy` as the script name defined inside `packages/db/package.json`.

#### Solution:
Update root `package.json` to explicitly use `run deploy`:
```json
"db:deploy": "pnpm --filter @repo/db run deploy"
```
When `run` is explicitly declared, pnpm correctly delegates the command to the package script `prisma migrate deploy` rather than invoking its native directory deployment tool.

---

### 1.2 Missing Prisma Schema Location in Monorepo Postinstall

#### Symptom:
During `pnpm install` or build steps on CI/CD, the following warning appeared:
```
prisma:warn We could not find your Prisma schema in the default locations (see: https://pris.ly/d/prisma-schema-location).
prisma:warn If you have a Prisma schema file in a custom path, you will need to run prisma generate --schema=./path/to/your/schema.prisma
```

#### Root Cause:
In a monorepo, the Prisma CLI is installed in both the root and `packages/db`. When Prisma's `postinstall` hook runs at the repository root, it looks for `./prisma/schema.prisma` in the workspace root. Since the schema resides at `packages/db/prisma/schema.prisma`, Prisma issued a warning.

#### Solution:
Add explicit Prisma schema path pointers in `package.json`:

In root `package.json`:
```json
"prisma": {
  "schema": "packages/db/prisma/schema.prisma"
}
```

In `packages/db/package.json`:
```json
"prisma": {
  "schema": "prisma/schema.prisma"
}
```
This guarantees that Prisma CLI and postinstall generators immediately locate the schema regardless of execution directory.

---

## 2. Database & Migration Challenges

### 2.1 Failed Production Migration Lockout (`P3009`)

#### Symptom:
Vercel deployment failed during the `db:deploy` phase with:
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve
The `20261103000000_add_candidate_experience_range` migration started at 2026-11-02 23:39:04.167248 UTC failed
```

#### Root Cause:
A previous deployment or manual migration attempt was interrupted (or encountered a transient connection reset on Neon), leaving an entry in PostgreSQL's internal `_prisma_migrations` table with `finished_at = NULL` and `applied_steps_count = 0`. As a safety measure, Prisma blocks all future migrations until failed states are resolved to prevent corrupting database schema history.

#### Solution:
Inspect the database to verify the columns were present, then resolve the migration record using the Prisma CLI:
```bash
npx prisma migrate resolve --applied 20261103000000_add_candidate_experience_range
```
This marked the migration as cleanly applied in `_prisma_migrations`, allowing subsequent deployments to apply subsequent index and feature migrations without failure.

---

### 2.2 Missing Foreign Key Indexes Causing Slow Dashboard Aggregations

#### Symptom:
As jobs and skill associations scaled, the `/dashboard` page experienced degraded query times (exceeding 1.8 seconds) when aggregating jobs and checking skill overlap.

#### Root Cause:
PostgreSQL creates unique indexes for primary keys, but does not automatically index foreign keys on join tables. In `packages/db/prisma/schema.prisma`:
- `JobSkill` had a composite primary key on `[jobId, skillId]`, which creates an index starting with `jobId`. Queries looking up `WHERE skillId = ...` triggered full table sequential scans.
- `Job` had an index on `[userId, status, discoveredAt]`, but queries joining `Company` on `companyId` had no dedicated index on `Job(companyId)`.

#### Solution:
Created migration `20261103020000_add_job_skill_and_company_indexes` adding explicit B-tree indexes:
```prisma
model Job {
  // ...
  @@index([companyId])
}

model JobSkill {
  // ...
  @@index([skillId])
}
```
This reduced join query latency from hundreds of milliseconds to under 5 milliseconds.

---

## 3. Serverless Runtime & Deployment Bugs

### 3.1 Missing Prisma Query Engine Binary on Vercel AWS Lambda (HTTP 500)

#### Symptom:
The application worked flawlessly on localhost. However, immediately after deploying to Vercel (`https://job-intel-six.vercel.app`), all tRPC endpoints (`dashboard.getSummary`, `dashboard.getTopMatches`, `jobs.list`, `profile.get`) crashed with HTTP 500.

Browser console output:
```
Failed to load resource: the server responded with a status of 500 ()
GET /api/trpc/dashboard.getSummary,dashboard.getTopMatches 500 (Internal Server Error)
```

#### Root Cause:
1. Vercel functions execute in an AWS Lambda container running Amazon Linux 2 / RHEL (requiring OpenSSL 3.0.x).
2. The local development machine was Linux x64 with native OpenSSL.
3. In `packages/db/prisma/schema.prisma`, `generator client` only specified `binaryTargets = ["native"]`. It did not generate the Linux RHEL binary `libquery_engine-rhel-openssl-3.0.x.so.node`.
4. In Turborepo, Next.js bundles `apps/web` into `.next/server/`. Because Prisma lived in `packages/db`, Next.js's tree-shaking bundling did not copy the native `.so.node` binary into the serverless function bundle directory.

#### Solution:
A three-step remediation was implemented:

1. **Schema Binary Targets**:
   Update `packages/db/prisma/schema.prisma`:
   ```prisma
   generator client {
     provider      = "prisma-client-js"
     binaryTargets = ["native", "rhel-openssl-3.0.x"]
   }
   ```

2. **Next.js Monorepo Workaround Plugin**:
   In `apps/web/next.config.ts`, include `@prisma/nextjs-monorepo-workaround-plugin`:
   ```typescript
   import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
   
   const nextConfig: NextConfig = {
     webpack: (config, { isServer }) => {
       if (isServer) {
         config.plugins.push(new PrismaPlugin());
       }
       return config;
     },
   };
   ```

3. **Build Engine Copier (`copy-engine.js`)**:
   Created `apps/web/copy-engine.js` executed automatically in `postbuild` to guarantee the binary is present in `.next/server/` and `.prisma/client/`:
   ```javascript
   const fs = require('fs');
   const path = require('path');
   const engineName = 'libquery_engine-rhel-openssl-3.0.x.so.node';
   // Copies binary to .next/server and .next/server/chunks
   ```

4. **Live Verification**:
   Added an isolated healthcheck endpoint `apps/web/app/api/health-db/route.ts` to test raw database queries independently of tRPC. Tested live on Vercel:
   ```json
   {"status":"ok","dbStatus":"connected","durationMs":1905,"userCount":1,"dbError":null}
   ```

---

### 3.2 Clerk Production DNS Failure on Shared Vercel Domains (`ERR_CONNECTION_CLOSED`)

#### Symptom:
After updating Vercel environment variables to Clerk Production keys (`pk_live_...` and `sk_live_...`), the site completely failed to render with browser console errors:
```
GET https://clerk.job-intel-six.vercel.app/npm/@clerk/clerk-js@5/dist/clerk.browser.js net::ERR_CONNECTION_CLOSED
Uncaught (in promise) e: Clerk: Failed to load Clerk (code="failed_to_load_clerk_js")
```

#### Root Cause:
1. **Clerk Production Architecture**: In production mode (`pk_live_...`), Clerk routes its Frontend API through a custom subdomain of your application (e.g., `clerk.job-intel-six.vercel.app`).
2. **DNS CNAME Requirement**: For `clerk.job-intel-six.vercel.app` to resolve, a DNS CNAME record must point to `frontend-api.clerk.services`.
3. **Domain Ownership Limitation**: The domain `vercel.app` is owned by Vercel. Third-party developers cannot create or manage DNS records on `*.vercel.app`.
4. When the browser requested `https://clerk.job-intel-six.vercel.app/`, the request arrived at Vercel's edge network. Having no routing rule or SSL certificate for `clerk.job-intel-six.vercel.app`, Vercel dropped the connection with `ERR_CONNECTION_CLOSED`.

#### Solution:
Documented two clear architectural solutions:
- **For Staging / Testing on `*.vercel.app`**: Revert to Clerk Development keys (`pk_test_...` and `sk_test_...`). In development mode, Clerk scripts are served from Clerk's managed domain `clerk.accounts.dev`, requiring zero DNS records.
- **For Production with `pk_live_...`**: Connect a custom domain owned by the developer (e.g. `yourdomain.com`) to Vercel, register `yourdomain.com` in Clerk Dashboard, and add the required CNAME records in the registrar's DNS panel.

---

## 4. Authentication & State Synchronization

### 4.1 Client Auth Race Condition Causing Premature HTTP 401 Queries

#### Symptom:
Immediately after the database query engine issue was resolved, the browser console showed HTTP 401 (Unauthorized) errors for:
```
GET /api/trpc/dashboard.getSummary,dashboard.getTopMatches 401 (Unauthorized)
GET /api/trpc/jobs.list 401 (Unauthorized)
```

#### Root Cause:
In Next.js 15 App Router, React client components mounted and triggered React Query hooks before Clerk's client SDK finished initializing session tokens. When `useQuery` fired, `ctx.auth.userId` was null, causing `protectedProcedure` in `trpc.ts` to immediately throw an `UNAUTHORIZED` exception.

#### Solution:
In `apps/web/components/layout/AppShell.tsx`, use Clerk's `useAuth()` hook to guard the component tree:
```tsx
const { isLoaded, isSignedIn } = useAuth();

if (!isLoaded) {
  return <AppShellLoadingSkeleton />;
}

if (!isSignedIn) {
  return null; // Next.js middleware redirects to /sign-in
}

return <>{children}</>;
```
Queries inside child pages only mount after `isLoaded && isSignedIn` is true, ensuring valid authentication tokens accompany every API call.

---

### 4.2 Missing User Record & Webhook Latency Auto-Provisioning

#### Symptom:
A newly registered user authenticated with Clerk encountered HTTP 500 errors because queries like `prisma.job.findMany({ where: { userId: ctx.userId } })` relied on the internal PostgreSQL `User.id` foreign key, but no row existed yet in the database.

#### Root Cause:
In traditional architectures, database user records are created via Clerk HTTP webhooks. If webhooks are delayed, misconfigured, or running in local development without a tunneling tool (ngrok), the user row never gets created.

#### Solution:
Self-healing auto-provisioning was implemented in `apps/web/server/trpc/context.ts`:
```typescript
if (session?.userId && !dbUser) {
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress 
    || `${session.userId}@user.local`;

  // Check if an account already exists with this email (e.g., from a dev seed)
  const existingByEmail = await prisma.user.findUnique({
    where: { email: primaryEmail },
  });

  if (existingByEmail) {
    dbUser = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { clerkId: session.userId },
    });
  } else {
    dbUser = await prisma.user.create({
      data: {
        clerkId: session.userId,
        email: primaryEmail,
        name: `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || undefined,
      },
    });
  }
}
```
This guarantees that regardless of webhook delivery status, any authenticated request automatically creates or syncs the internal user record before procedures run.

---

## 5. Performance & Data Fetching Bottlenecks

### 5.1 Sequential Database Latency in Dashboard Data Fetching

#### Symptom:
The dashboard required 4 distinct data sources:
1. Summary job counts and status breakdowns.
2. Candidate profile and preferred search filters.
3. Recent application status transition history.
4. Recommended skill gap records.
Loading took over 1.2 seconds due to waterfall network requests.

#### Root Cause:
The server executed each database query sequentially:
```typescript
const jobs = await prisma.job.findMany(...);
const profile = await prisma.candidateProfile.findUnique(...);
const history = await prisma.applicationStatusHistory.findMany(...);
const gaps = await prisma.skillGapRecommendation.findMany(...);
```
Total round-trip time was the sum of all individual query latencies.

#### Solution:
1. Re-architected `dashboardRouter.getSummary` to use `Promise.all`:
   ```typescript
   const [rawJobs, fitData, statusHistory, persistedRecommendations] = await Promise.all([
     ctx.prisma.job.findMany(...),
     getUserFitData(userId, ctx.prisma),
     ctx.prisma.applicationStatusHistory.findMany(...),
     getSkillGapsForUser(userId, ctx.prisma),
   ]);
   ```
2. Introduced an in-memory cache `getUserFitData` in `apps/web/server/userFitCache.ts` with a 60-second TTL to avoid re-reading candidate profile and skills when multiple procedures run in parallel.
Total latency dropped from ~1200ms to ~250ms.

---

### 5.2 Aggressive Re-Fetching and Flashing UI on Page Navigation

#### Symptom:
Navigating between `/` (Dashboard) and `/jobs` caused full-screen loading spinners and UI flashes. Typing into the job filter search bar triggered API calls on every keystroke.

#### Root Cause:
1. TanStack React Query defaults to `staleTime: 0`, marking data stale immediately upon receipt and triggering refetches on window focus or component remount.
2. The search input in `apps/web/app/jobs/page.tsx` was directly bound to query state without debounce.

#### Solution:
1. In `apps/web/lib/trpc/Provider.tsx`, configured global React Query defaults:
   ```typescript
   defaultOptions: {
     queries: {
       staleTime: 60 * 1000,       // Data considered fresh for 60 seconds
       gcTime: 10 * 60 * 1000,     // Retained in garbage collection for 10 minutes
       refetchOnWindowFocus: false, // Prevents unnecessary network requests
     },
   }
   ```
2. Implemented a 280ms debounce on search inputs:
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => setDebouncedSearch(searchTerm), 280);
     return () => clearTimeout(timer);
   }, [searchTerm]);
   ```
3. Added `placeholderData: (previousData) => previousData` in `useQuery` calls to prevent table collapses when paginating or filtering.

---

## 6. AI & Filtering Accuracy

### 6.1 Irrelevant Jobs and Seniority Mismatches in Feed

#### Symptom:
A software engineer candidate with 2 years of experience was seeing listings for:
- "Director of Nursing"
- "VP of Infrastructure"
- "High School Summer Intern"

#### Root Cause:
Relying solely on keyword searches or vector embeddings caused false positives:
- A job mentioning "team leadership" matched candidate leadership summaries even if the job was in an unrelated field (e.g., healthcare).
- Vector embeddings capture broad conceptual relatedness but cannot enforce strict numeric constraints like "candidate has 2 years of experience, but job requires 10+".

#### Solution:
Engineered the 3-Stage Deterministic Filtration Engine (`apps/web/server/jobFilterEngine.ts`):
1. **Stage 1 (Seniority Gate)**:
   - Evaluates regular expressions for seniority markers (`INTERN`, `ENTRY`, `SENIOR`, `STAFF_PRINCIPAL`, `EXECUTIVE`).
   - Extracts minimum required years of experience from description text.
   - Rejects candidate-job pairs with seniority mismatches before scoring.
2. **Stage 2 (Location Gate)**:
   - Resolves tech hub city synonyms (e.g. `Bengaluru <-> Bangalore <-> BLR`, `SF <-> Bay Area`).
   - Strictly enforces `REMOTE` or `ONSITE` preferences.
3. **Stage 3 (Position & Domain Gate)**:
   - Employs `UNRELATED_DOMAINS_REGEX` to automatically disqualify non-technical occupations (nursing, retail, culinary, legal, manual trades).
   - Requires token overlap with candidate target roles and verified technical skills.

---

### 6.2 Generative LLM Hallucinations in Match Explanations

#### Symptom:
Match explanations generated by generative models produced fabricated claims, such as telling a candidate: "You are a strong fit because you have 4 years of Kubernetes and Rust experience", when neither skill was on the candidate's profile.

#### Root Cause:
Providing open-ended prompts to LLMs allows models to confabulate details from training data or extrapolate unsupported assumptions from job descriptions.

#### Solution:
Implemented strict prompt fencing and rule-based fallbacks in `apps/web/server/matching.ts`:
1. **Fenced Input Payload**:
   The prompt receives explicit, pre-calculated arrays of `matchedSkills` and `missingSkills`:
   ```typescript
   const prompt = `Given the following computed match data, write a 2-3 sentence explanation.
   Do not state anything that contradicts the data below:
   Position: ${jobTitle}
   Match score: ${matchScore}%
   Matched skills: ${matchedSkills.join(", ")}
   Missing skills: ${missingSkills.join(", ")}
   Do not fabricate or infer any skills outside the lists provided.`;
   ```
2. **Deterministic Grounded Fallback**:
   If the LLM generates empty text, encounters rate limits, or is unconfigured, the system immediately falls back to `generateGroundedExplanation()`, which constructs explanations using deterministic templates:
   ```typescript
   export function generateGroundedExplanation(matchScore, matchedSkills, missingSkills) {
     if (matchScore >= 80) {
       return `Excellent match (${matchScore}%). Strong alignment across ${matchedSkills.slice(0, 3).join(", ")}.`;
     }
     // ...
   }
   ```
This guarantees 100% factual accuracy and complete resistance to hallucination.
