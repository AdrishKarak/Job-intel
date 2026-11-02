import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./root";
import type { Context } from "./context";

describe("jobsRouter Integration & Per-User Isolation", () => {
  const testUserId = "user_test_crm_123";
  const otherUserId = "user_other_456";

  let mockJobs: any[] = [];
  let mockHistory: any[] = [];

  const mockPrisma = {
    job: {
      findMany: vi.fn(async ({ where, skip, take }) => {
        let results = mockJobs.filter((j) => j.userId === where.userId);
        if (where.status) {
          results = results.filter((j) => j.status === where.status);
        }
        if (typeof skip === "number" && typeof take === "number") {
          return results.slice(skip, skip + take);
        }
        return results;
      }),
      count: vi.fn(async ({ where }) => {
        return mockJobs.filter((j) => j.userId === where.userId).length;
      }),
      findFirst: vi.fn(async ({ where }) => {
        return mockJobs.find((j) => j.id === where.id && j.userId === where.userId) || null;
      }),
      update: vi.fn(async ({ where, data }) => {
        const item = mockJobs.find((j) => j.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const before = mockJobs.length;
        if (where.expiresAt) {
          mockJobs = mockJobs.filter(
            (j) => !(j.userId === where.userId && j.expiresAt <= where.expiresAt.lte)
          );
        } else if (where.id && where.id.in) {
          mockJobs = mockJobs.filter(
            (j) => !(j.userId === where.userId && where.id.in.includes(j.id))
          );
        }
        return { count: before - mockJobs.length };
      }),
    },
    candidateProfile: {
      findUnique: vi.fn(async () => ({
        preferredRoles: ["Backend Engineer"],
        preferredLocations: ["Remote"],
        remotePreference: "REMOTE",
        experienceYears: 4,
      })),
    },
    userSkill: {
      findMany: vi.fn(async () => []),
    },
    applicationStatusHistory: {
      create: vi.fn(async ({ data }) => {
        const historyItem = { id: `hist_${Date.now()}`, ...data, changedAt: new Date() };
        mockHistory.push(historyItem);
        return historyItem;
      }),
    },
  };

  const mockCtx: Context = {
    prisma: mockPrisma as any,
    auth: { userId: "clerk_crm" } as any,
    user: { id: testUserId, clerkId: "clerk_crm", email: "crm@example.com", name: "CRM User" } as any,
  };

  beforeEach(() => {
    mockJobs = [
      {
        id: "job_1",
        userId: testUserId,
        title: "Senior Backend Engineer",
        status: "DISCOVERED",
        company: { id: "comp_1", name: "Stripe", atsType: "GREENHOUSE" },
        jobSkills: [],
        discoveredAt: new Date(),
        expiresAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      },
      {
        id: "job_2",
        userId: otherUserId, // Different user!
        title: "Frontend Architect",
        status: "DISCOVERED",
        company: { id: "comp_2", name: "Figma", atsType: "GREENHOUSE" },
        jobSkills: [],
        discoveredAt: new Date(),
        expiresAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      },
    ];
    mockHistory = [];
    vi.clearAllMocks();
  });

  it("lists only jobs scoped to session userId (AC 27.1)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.jobs.list({ page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.jobs.length).toBe(1);
    expect(result.jobs[0].userId).toBe(testUserId);
    expect(result.jobs[0].title).toBe("Senior Backend Engineer");
  });

  it("updates job status and creates an ApplicationStatusHistory record (AC 16.1, AC 16.2)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const updated = await caller.jobs.updateStatus({
      jobId: "job_1",
      status: "INTERVIEW_SCHEDULED",
      note: "Hiring manager screen scheduled for Thursday",
    });

    expect(updated.status).toBe("INTERVIEW_SCHEDULED");

    // Check append-only status history
    expect(mockHistory.length).toBe(1);
    expect(mockHistory[0].jobId).toBe("job_1");
    expect(mockHistory[0].status).toBe("INTERVIEW_SCHEDULED");
    expect(mockHistory[0].note).toBe("Hiring manager screen scheduled for Thursday");
  });

  it("rejects getById for jobs belonging to a different user (AC 27.1)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    await expect(
      caller.jobs.getById({ jobId: "job_2" })
    ).rejects.toThrow("Job not found");
  });

  it("cleans up expired jobs older than 40 days (AC 18.1, ADR-009)", async () => {
    // Add an expired job for testUserId
    mockJobs.push({
      id: "job_expired",
      userId: testUserId,
      title: "Old Job",
      status: "DISCOVERED",
      expiresAt: new Date(Date.now() - 1000), // in the past
    });

    const caller = appRouter.createCaller(mockCtx);
    const cleanupResult = await caller.jobs.cleanupExpired();
    expect(cleanupResult.deletedCount).toBe(1);
  });

  it("paginates jobs properly with page and limit", async () => {
    // Add multiple jobs for testUserId
    for (let i = 2; i <= 5; i++) {
      mockJobs.push({
        id: `job_${i}`,
        userId: testUserId,
        title: `Backend Engineer ${i}`,
        status: "DISCOVERED",
        company: { id: "comp_1", name: "Stripe", atsType: "GREENHOUSE" },
        jobSkills: [],
        discoveredAt: new Date(),
        expiresAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      });
    }

    const caller = appRouter.createCaller(mockCtx);
    const page1 = await caller.jobs.list({ page: 1, limit: 2 });
    expect(page1.jobs.length).toBe(2);
    expect(page1.page).toBe(1);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);

    const page2 = await caller.jobs.list({ page: 2, limit: 2 });
    expect(page2.jobs.length).toBe(2);
    expect(page2.page).toBe(2);
  });

  it("prunes irrelevant non-matching jobs from database", async () => {
    // Add irrelevant job (Nurse in clinical setting)
    mockJobs.push({
      id: "job_nurse",
      userId: testUserId,
      title: "Registered Nurse (ICU)",
      description: "Hospital clinical care",
      status: "DISCOVERED",
      company: { id: "comp_hosp", name: "Hospital", atsType: "GREENHOUSE" },
      jobSkills: [],
      discoveredAt: new Date(),
      expiresAt: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    });

    const caller = appRouter.createCaller(mockCtx);
    const pruneRes = await caller.jobs.pruneIrrelevant();
    expect(pruneRes.deletedCount).toBeGreaterThanOrEqual(1);
    expect(mockJobs.find((j) => j.id === "job_nurse")).toBeUndefined();
  });
});
