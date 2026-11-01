import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateJobsExcel } from "./excel";
import { sendDailyReportEmail } from "./email";
import { appRouter } from "./trpc/root";
import type { Context } from "./trpc/context";

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async (options) => ({
        messageId: "mock_test_msg_id_123",
        accepted: [options.to],
      })),
    })),
  },
}));

describe("Reporting, Email & Excel Delivery (Phase 7)", () => {
  const testUserId = "user_report_123";
  const otherUserId = "user_other_456";

  let mockJobs: any[] = [];
  let mockReports: any[] = [];

  const mockPrisma = {
    job: {
      findMany: vi.fn(async ({ where }) => {
        return mockJobs.filter((j) => j.userId === where.userId);
      }),
      count: vi.fn(async ({ where }) => {
        return mockJobs.filter((j) => j.userId === where.userId).length;
      }),
    },
    report: {
      findMany: vi.fn(async ({ where }) => {
        return mockReports.filter((r) => r.userId === where.userId);
      }),
      create: vi.fn(async ({ data }) => {
        const item = { id: `rep_${Date.now()}`, ...data, generatedAt: new Date() };
        mockReports.push(item);
        return item;
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.id === testUserId) {
          return { id: testUserId, email: "seeker@test.com", name: "Seeker Test" };
        }
        return null;
      }),
    },
    applicationStatusHistory: {
      findMany: vi.fn(async ({ where }) => []),
    },
    skillGapRecommendation: {
      findMany: vi.fn(async ({ where }) => []),
    },
  };

  const mockCtx: Context = {
    prisma: mockPrisma as any,
    auth: { userId: "clerk_rep" } as any,
    user: { id: testUserId, clerkId: "clerk_rep", email: "seeker@test.com", name: "Seeker Test" } as any,
  };

  beforeEach(() => {
    mockJobs = [
      {
        id: "job_1",
        userId: testUserId,
        title: "Senior Backend Engineer",
        status: "DISCOVERED",
        company: { name: "Stripe" },
        location: "Remote",
        remote: true,
        salaryMin: 160000,
        salaryMax: 200000,
        matchScore: 92,
        applicationUrl: "https://stripe.com/jobs/1",
        discoveredAt: new Date(),
      },
      {
        id: "job_2",
        userId: otherUserId, // other user
        title: "Frontend Architect",
        status: "DISCOVERED",
        company: { name: "Figma" },
        location: "San Francisco, CA",
        remote: false,
        salaryMin: 170000,
        salaryMax: 210000,
        matchScore: 88,
        applicationUrl: "https://figma.com/jobs/2",
        discoveredAt: new Date(),
      },
    ];

    mockReports = [
      {
        id: "rep_1",
        userId: testUserId,
        type: "DAILY",
        summary: { newJobs: 1, bestMatches: [], skillGaps: [], statusChanges: [] },
        generatedAt: new Date(),
      },
      {
        id: "rep_2",
        userId: otherUserId, // other user
        type: "DAILY",
        summary: { newJobs: 5, bestMatches: [], skillGaps: [], statusChanges: [] },
        generatedAt: new Date(),
      },
    ];
  });

  it("generates valid XLSX spreadsheet buffer for user jobs", async () => {
    const buffer = await generateJobsExcel(testUserId, mockPrisma);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    // Verify ZIP / XLSX magic bytes (PK..)
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it("formats and dispatches daily email for active highlights (AC 25.1)", async () => {
    const summary = {
      newJobs: 3,
      bestMatches: [
        { jobId: "j1", title: "Staff Engineer", company: "Stripe", matchScore: 94 },
      ],
      skillGaps: [{ skill: "Kubernetes", frequency: 4 }],
      statusChanges: [{ jobId: "j1", from: "DISCOVERED", to: "APPLIED" }],
    };

    const res = await sendDailyReportEmail("seeker@test.com", summary, "Seeker");
    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
  });

  it("handles graceful 'nothing new' case with positive messaging (AC 25.2)", async () => {
    const emptySummary = {
      newJobs: 0,
      bestMatches: [],
      skillGaps: [],
      statusChanges: [],
    };

    const res = await sendDailyReportEmail("seeker@test.com", emptySummary, "Seeker");
    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
  });

  it("strictly scopes reports list to authenticated user (AC 27.1)", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const reports = await caller.reports.list();

    expect(reports.length).toBe(1);
    expect(reports[0].userId).toBe(testUserId);
  });

  it("exports Excel data through tRPC mutation with correct filename and mimeType", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const res = await caller.reports.exportExcel();

    expect(res.fileName).toMatch(/^job-intel-export-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(res.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.data).toBeDefined();
    expect(typeof res.data).toBe("string");
  });
});
