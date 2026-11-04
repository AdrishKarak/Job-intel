import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./root";
import type { Context } from "./context";

describe("dashboardRouter Integration & User Isolation (Phase 5)", () => {
  const testUserId = "user_dash_123";
  const otherUserId = "user_other_456";

  let mockJobs: any[] = [];
  let mockHistory: any[] = [];
  let mockRecommendations: any[] = [];

  const mockPrisma = {
    job: {
      findMany: vi.fn(async ({ where, skip, take }) => {
        let results = mockJobs.filter((j) => j.userId === where.userId);
        if (typeof skip === "number" && typeof take === "number") {
          results = results.slice(skip, skip + take);
        }
        return results;
      }),
      count: vi.fn(async ({ where }) => {
        return mockJobs.filter((j) => j.userId === where.userId).length;
      }),
    },
    candidateProfile: {
      findUnique: vi.fn(async () => ({
        preferredRoles: ["Backend Engineer", "Full Stack Engineer", "Platform Engineer"],
        preferredLocations: ["Remote"],
        remotePreference: "REMOTE",
        experienceYears: 4,
      })),
    },
    userSkill: {
      findMany: vi.fn(async () => []),
    },
    applicationStatusHistory: {
      findMany: vi.fn(async ({ where }) => {
        return mockHistory.filter((h) => h.userId === where.userId);
      }),
    },
    skillGapRecommendation: {
      findMany: vi.fn(async ({ where }) => {
        return mockRecommendations.filter((r) => r.userId === where.userId);
      }),
      deleteMany: vi.fn(async ({ where }) => {
        mockRecommendations = mockRecommendations.filter((r) => r.userId !== where.userId);
        return { count: 1 };
      }),
      create: vi.fn(async ({ data }) => {
        const item = { id: `rec_${Date.now()}_${Math.random()}`, ...data };
        mockRecommendations.push(item);
        return item;
      }),
    },
    $transaction: vi.fn(async (promises) => {
      return Promise.all(promises);
    }),
  };

  const mockCtx: Context = {
    prisma: mockPrisma as any,
    auth: { userId: "clerk_dash" } as any,
    user: { id: testUserId, clerkId: "clerk_dash", email: "dash@example.com", name: "Dash User" } as any,
    authError: null,
    dbError: null,
  };

  beforeEach(() => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    mockJobs = [
      {
        id: "job_1",
        userId: testUserId,
        title: "Senior Backend Engineer",
        status: "APPLIED",
        matchScore: 85,
        missingSkills: ["Go", "Kafka"],
        discoveredAt: today,
        company: { name: "Stripe" },
      },
      {
        id: "job_2",
        userId: testUserId,
        title: "Full Stack Engineer",
        status: "INTERVIEW_SCHEDULED",
        matchScore: 75,
        missingSkills: ["Kafka", "GraphQL"],
        discoveredAt: yesterday,
        company: { name: "Figma" },
      },
      {
        id: "job_3",
        userId: testUserId,
        title: "Platform Engineer",
        status: "OFFER",
        matchScore: 92,
        missingSkills: ["Go"],
        discoveredAt: today,
        company: { name: "Airbnb" },
      },
      {
        id: "job_4",
        userId: otherUserId, // Belonging to another user
        title: "Security Engineer",
        status: "APPLIED",
        matchScore: 60,
        missingSkills: ["Rust"],
        discoveredAt: today,
        company: { name: "Datadog" },
      },
    ];

    mockHistory = [
      {
        id: "hist_1",
        userId: testUserId,
        jobId: "job_2",
        status: "INTERVIEW_SCHEDULED",
        changedAt: new Date(Date.now() - 1000),
        note: "Round 1 Technical Screen scheduled",
        job: { title: "Full Stack Engineer", company: { name: "Figma" } },
      },
      {
        id: "hist_2",
        userId: otherUserId, // Belonging to another user
        jobId: "job_4",
        status: "APPLIED",
        changedAt: new Date(),
        note: "Applied on career portal",
        job: { title: "Security Engineer", company: { name: "Datadog" } },
      },
    ];
  });

  it("calculates accurate summary metrics strictly scoped to user", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const summary = await caller.dashboard.getSummary();

    // User has 3 jobs, other user's 1 job must not leak
    expect(summary.stats.totalJobs).toBe(3);
    expect(summary.stats.jobsFoundToday).toBe(2); // job_1 and job_3
    expect(summary.stats.activeApplications).toBe(2); // APPLIED + INTERVIEW_SCHEDULED
    expect(summary.stats.interviews).toBe(1); // INTERVIEW_SCHEDULED
    expect(summary.stats.offers).toBe(1); // OFFER

    // Average match score: (85 + 75 + 92) / 3 = 84%
    expect(summary.stats.avgMatchScore).toBe(84);
  });

  it("aggregates match score distribution correctly", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const summary = await caller.dashboard.getSummary();

    // 85 (high), 92 (high), 75 (good)
    expect(summary.scoreDistribution.high).toBe(2);
    expect(summary.scoreDistribution.good).toBe(1);
    expect(summary.scoreDistribution.moderate).toBe(0);
    expect(summary.scoreDistribution.unscored).toBe(0);
  });

  it("aggregates top missing skills correctly (AC 19.1)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const summary = await caller.dashboard.getSummary();

    // "Go": in job_1 and job_3 (count: 2)
    // "Kafka": in job_1 and job_2 (count: 2)
    // "GraphQL": in job_2 (count: 1)
    // "Rust" (from other user) must NOT be present
    const gapMap = new Map(summary.topSkillGaps.map((g) => [g.skillName, g.count]));
    expect(gapMap.get("Go")).toBe(2);
    expect(gapMap.get("Kafka")).toBe(2);
    expect(gapMap.get("GraphQL")).toBe(1);
    expect(gapMap.has("Rust")).toBe(false);
  });

  it("returns recent activity containing only current user events", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const summary = await caller.dashboard.getSummary();

    // Other user's activity must be excluded
    const companyNames = summary.recentActivity.map((a) => a.company);
    expect(companyNames).toContain("Figma");
    expect(companyNames).not.toContain("Datadog");
  });

  it("persists and returns skill gap recommendations on refreshSkillGaps (AC 19.1)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.dashboard.refreshSkillGaps();

    expect(result.count).toBeGreaterThan(0);
    expect(result.recommendations[0].skillName).toBeDefined();
    expect(result.recommendations[0].frequency).toBeGreaterThan(0);
    expect(result.recommendations[0].estimatedLift).toBeDefined();
  });

  it("returns paginated top matches with correct total count and isolation", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const res = await caller.dashboard.getTopMatches({ page: 1, limit: 2 });

    expect(res.jobs.length).toBe(2);
    expect(res.page).toBe(1);
    expect(res.total).toBe(3); // only testUserId jobs
    expect(res.totalPages).toBe(2);
  });
});
