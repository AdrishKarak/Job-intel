# AI Job Intelligence Platform

An autonomous, multi-ATS job search intelligence engine and application tracking system built for engineers and knowledge workers. The platform continuously aggregates postings across major Applicant Tracking Systems (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Workday), evaluates candidate compatibility through a deterministic 3-stage filtration pipeline, refines matches with semantic vector embeddings, extracts structured profiles from resumes, and delivers daily executive intelligence reports.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Core Technologies](#core-technologies)
- [Monorepo Architecture](#monorepo-architecture)
- [System Architecture Documentation](#system-architecture-documentation)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup & Seeding](#database-setup--seeding)
  - [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [Prisma Engine Handling on Serverless](#prisma-engine-handling-on-serverless)
  - [Clerk Authentication on Production Domains](#clerk-authentication-on-production-domains)
- [Environment Variables Reference](#environment-variables-reference)

---

## Overview

Modern technical job seekers face fragmented career boards, aggressive keyword-stuffing filters, and a high volume of mismatched job listings. The AI Job Intelligence Platform provides an automated, developer-first pipeline that:

1. Ingests raw job postings from multiple corporate career boards via standardized ATS connectors.
2. Applies a deterministic 3-stage qualification filter (Seniority/Experience -> Location/Remote -> Position/Skill alignment) to eliminate irrelevant noise before running complex computations.
3. Computes a composite match score (0 to 100) combining rule-based heuristics (70% weight) with pgvector cosine similarity embeddings (30% weight).
4. Generates grounded, hallucination-resistant explanations that highlight exact skill intersections and missing qualifications.
5. Surfaces aggregate skill gaps across the target market to guide candidate upskilling.
6. Automatically dispatches daily email summaries and offers single-click Excel export for full offline tracking.

All data is strictly multi-tenant isolated: every candidate profile, job record, and status transition is keyed by the authenticated user ID.

---

## Key Features

- **Multi-ATS Career Ingestion**: Standardized crawlers and API clients for Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and Workday, with Firecrawl integration for arbitrary custom career pages.
- **Deterministic 3-Stage Filtering**:
  - *Stage 1 (Experience)*: Extracts minimum required years of experience via regex and parses titles for seniority prefixes (Intern, Junior, Senior, Staff, Executive). Ensures junior candidates are not assigned director roles, and senior engineers are not fed entry/intern listings.
  - *Stage 2 (Location & Remote)*: Resolves city synonyms (e.g., Bengaluru/Bangalore/BLR, SF/Bay Area, NYC/Manhattan), respects strict remote or on-site preferences, and enforces regional restrictions (e.g., US-only vs India-friendly).
  - *Stage 3 (Position & Domain)*: Filters out non-technical occupational domains (nursing, retail, sales, legal) and verifies title/skill overlap.
- **Hybrid Matching Engine**:
  - Skill fit (50% rule weight), Role title fit (20%), Location fit (15%), and Compensation fit (15%).
  - Semantic vector similarity generated via Gemini/Groq embeddings, stored and queried using Neon's PostgreSQL `pgvector` extension (1536 dimensions).
- **Resume Parsing & Skill Extraction**: Ingests PDF and DOCX resumes, extracts structured career histories, education, projects, and verified skills, and creates a semantic candidate profile vector.
- **Application Tracking & Status Lifecycle**: Tracks applications across DISCOVERED, SAVED, APPLIED, OA_RECEIVED, OA_CLEARED, INTERVIEW_SCHEDULED, INTERVIEW_CLEARED, OFFER, REJECTED, and GHOSTED states with full timestamped audit history.
- **Skill Gap Recommendations**: Dynamically aggregates missing skills across high-scoring listings, computing market frequency and estimated match lift.
- **Automated Reporting & Export**:
  - Inngest background workflows running daily at 7:00 PM to compile highlights and send HTML summary emails.
  - Formatted multi-tab spreadsheet generation using `exceljs` for complete local record keeping.

---

## Core Technologies

- **Full-Stack Framework**: Next.js 15.5 (App Router), React 19, TypeScript 5.
- **API Communication**: tRPC 11 with SuperJSON transformer for end-to-end type safety between client and server.
- **Client State & Data Fetching**: TanStack React Query 5 with 60-second stale times and 10-minute cache retention.
- **Database & Vector Storage**: Neon Serverless PostgreSQL with `pgvector` extension for 1536-dimensional embeddings.
- **ORM**: Prisma 5.22 with custom RHEL OpenSSL binary targets for AWS Lambda/Vercel serverless functions.
- **Authentication**: Clerk Auth with auto-provisioning database hooks.
- **Background Jobs & Scheduling**: Inngest for resilient serverless cron scheduling and async task execution.
- **AI & LLM Services**: Google Gemini API (`@google/generative-ai`) and Groq Cloud SDK (`groq-sdk`) for resume extraction, match explanations, and embeddings.
- **File Parsing & Export**: `pdf-parse`, `mammoth` (DOCX extraction), and `exceljs`.
- **Monorepo Tooling**: Turborepo 2 and pnpm 9.

---

## Monorepo Architecture

The project is structured as a Turborepo workspace dividing concerns into an application package and shared library packages:

```
ai-job-intelligence-platform/
├── apps/
│   └── web/                   # Next.js 15 web application and backend tRPC API
│       ├── app/               # Next.js App Router (pages, layout, API routes)
│       ├── components/        # React UI components (Sidebar, AppShell, Filters)
│       ├── lib/               # Shared client utilities, tRPC client, constants
│       └── server/            # Backend domain logic (tRPC routers, engines, Inngest)
├── packages/
│   ├── db/                    # Prisma schema, migrations, database client, seeds
│   ├── ai-clients/            # Unified wrapper for Gemini, Groq, and embeddings
│   ├── ats-connectors/        # Scrapers and API clients for Greenhouse, Lever, Ashby, etc.
│   └── shared-types/          # Shared TypeScript interfaces, enums, and Zod schemas
├── docs/                      # Architectural decisions, PRDs, and technical specs
├── Architecture.md            # System architecture and architectural decision records
├── explain.md                 # Deep-dive file-by-file walkthrough and dataflow guide
└── package.json               # Root workspace configuration
```

---

## System Architecture Documentation

For in-depth diagrams, component breakdowns, and data flow walkthroughs, refer to the dedicated companion documents:

- [Architecture.md](file:///home/adrish/Desktop/ai-job-intelligence-platform/Architecture.md): Complete system architectural designs, Mermaid diagrams, database entity-relationship models, and Architectural Decision Records (ADRs).
- [explain.md](file:///home/adrish/Desktop/ai-job-intelligence-platform/explain.md): Detailed dataflow walkthroughs, comprehensive file-by-file breakdown, and annotated backend code explanations detailing the rationale behind design choices.

---

## Getting Started

### Prerequisites

- Node.js: version 20.x or higher
- Package Manager: `pnpm` version 9.x or higher (`corepack enable && corepack prepare pnpm@latest --activate`)
- PostgreSQL: Neon Serverless PostgreSQL account (with `pgvector` extension enabled) or a local PostgreSQL 16+ instance
- Clerk Account: for authentication tokens (Development or Production keys)

### Installation

Clone the repository and install all monorepo dependencies:

```bash
git clone https://github.com/your-org/ai-job-intelligence-platform.git
cd ai-job-intelligence-platform
pnpm install
```

### Environment Configuration

Copy the example environment configuration into both the root directory and the web application:

```bash
cp .env.example .env
cp .env.example apps/web/.env.local
```

Edit `.env` and provide your credentials:

```bash
# Database (Neon PostgreSQL with connection pooling and direct URL)
DATABASE_URL="postgresql://user:password@ep-pooler.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:password@ep-direct.neon.tech/neondb?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# AI Inference (Gemini and/or Groq)
GEMINI_API_KEY="AIzaSy..."
GROQ_API_KEY="gsk_..."

# Email Delivery (SMTP or Resend)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="SG...."
EMAIL_FROM="alerts@yourdomain.com"
```

### Database Setup & Seeding

Deploy Prisma migrations to your PostgreSQL database and generate the Prisma Client:

```bash
# Generate Prisma Client across the monorepo
pnpm db:generate

# Deploy migrations to the database
pnpm db:deploy

# Seed initial companies and benchmark technical skills
pnpm db:seed
```

### Running the Application

Start the local development server:

```bash
pnpm dev
```

The web application will be accessible at `http://localhost:3000`.

---

## Available Scripts

The following commands are available from the repository root:

- `pnpm dev`: Runs the development server via Turborepo across all workspaces.
- `pnpm build`: Builds all packages and compiles the Next.js application for production.
- `pnpm test`: Runs all unit and integration test suites using Vitest.
- `pnpm lint`: Runs ESLint across all packages in the monorepo.
- `pnpm db:generate`: Regenerates the Prisma Client from `packages/db/prisma/schema.prisma`.
- `pnpm db:migrate`: Creates and applies a new migration in development.
- `pnpm db:deploy`: Applies pending migrations to the target database in production environments.
- `pnpm db:seed`: Executes the database seed script to populate default companies and skills.

---

## Testing

The test suite is built on Vitest and validates core domain logic, security isolation, filter algorithms, and router endpoints without requiring live database or LLM network connections:

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm --filter web test -- --watch
```

Test coverage includes:
- **Filtering Engine**: Seniority boundary checks, location synonym resolution, and non-tech occupational exclusion.
- **Scoring Engine**: Skill overlap calculation, salary proportionality, and semantic fallback handling.
- **Hardening & Isolation**: Multi-tenant data segregation, preventing access across user boundaries.
- **tRPC Routers**: Input schema validation and protected procedure authorization gates.

---

## Deployment

### Vercel Deployment

The application is optimized for deployment on Vercel. 

1. Connect your repository to Vercel.
2. In Project Settings, set the Root Directory to `apps/web`.
3. Set the Build Command:
   ```bash
   pnpm --dir ../.. build
   ```
4. Configure all environment variables listed in the [Environment Variables Reference](#environment-variables-reference) in the Vercel dashboard.

### Prisma Engine Handling on Serverless

Vercel functions run on AWS Lambda (Linux RHEL). Because Prisma operates within a monorepo structure, Next.js bundling may isolate client files from engine binaries. This repository includes two mechanisms to guarantee zero runtime missing-engine errors:

1. `binaryTargets = ["native", "rhel-openssl-3.0.x"]` inside `packages/db/prisma/schema.prisma`.
2. A build-time script `apps/web/copy-engine.js` that automatically copies the required `libquery_engine-rhel-openssl-3.0.x.so.node` into `.next/server/` and `.prisma/client/` during every `pnpm build`.

### Clerk Authentication on Production Domains

When deploying to Vercel:

- **Using Default `*.vercel.app` Domains**: Use Clerk Development API keys (`pk_test_...` and `sk_test_...`). In development mode, Clerk scripts are served from `clerk.accounts.dev`, which requires no custom DNS records.
- **Using Custom Domains (e.g. `yourdomain.com`)**: You can use Clerk Production keys (`pk_live_...`). You must add the CNAME DNS records provided by Clerk (such as `clerk.yourdomain.com` pointing to `frontend-api.clerk.services`) in your domain registrar's DNS panel. Clerk Production keys will fail on `*.vercel.app` because custom CNAME records cannot be added to Vercel's shared domain.

---

## Environment Variables Reference

| Variable Name | Required | Default / Format | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection pooled URL for Neon PostgreSQL queries. |
| `DIRECT_URL` | Yes | `postgresql://...` | Direct connection URL for Prisma migrations and schema push. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | `pk_test_...` or `pk_live_...` | Clerk client publishable token. |
| `CLERK_SECRET_KEY` | Yes | `sk_test_...` or `sk_live_...` | Clerk backend authentication secret. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` | Path for client sign-in redirects. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` | Path for client sign-up redirects. |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Google Gemini API key for structured resume parsing and match insights. |
| `GROQ_API_KEY` | Optional | `gsk_...` | Groq Cloud API key for ultra-fast Llama-3 inference. |
| `SMTP_HOST` | Optional | `smtp.example.com` | Hostname for daily intelligence report email dispatch. |
| `SMTP_PORT` | Optional | `587` | Port for SMTP transmission. |
| `SMTP_USER` | Optional | `username` | SMTP authentication user. |
| `SMTP_PASS` | Optional | `password` | SMTP authentication credential. |
| `EMAIL_FROM` | Optional | `noreply@yourdomain.com` | From address for outbound summary emails. |
| `INNGEST_EVENT_KEY` | Optional | String | Signing key for Inngest background event processing. |
| `FIRECRAWL_API_KEY` | Optional | String | API key for Firecrawl arbitrary career board crawling. |
