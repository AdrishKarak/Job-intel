import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./root";
import type { Context } from "./context";
import { setParseJob } from "@/server/resumeParser";
import * as storage from "@/server/storage";

describe("profileRouter Integration & Guardrails", () => {
  const testUserId = "user_test_profile_123";

  // Mock DB state
  let mockProfile: any = null;
  let mockUserSkills: any[] = [];
  let mockSkills: any[] = [];

  const mockPrisma = {
    candidateProfile: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.userId === testUserId) return mockProfile;
        return null;
      }),
      upsert: vi.fn(async ({ where, update, create }) => {
        mockProfile = {
          id: "profile_1",
          userId: testUserId,
          ...(mockProfile || create),
          ...update,
        };
        return mockProfile;
      }),
      update: vi.fn(async ({ where, data }) => {
        if (mockProfile) {
          Object.assign(mockProfile, data);
        }
        return mockProfile;
      }),
    },
    userSkill: {
      findMany: vi.fn(async ({ where }) => {
        return mockUserSkills.filter((s) => s.userId === where.userId);
      }),
      findUnique: vi.fn(async ({ where }) => {
        return mockUserSkills.find(
          (s) =>
            s.userId === where.userId_skillId.userId &&
            s.skillId === where.userId_skillId.skillId
        );
      }),
      upsert: vi.fn(async ({ where, update, create, include }: any) => {
        let existing = mockUserSkills.find(
          (s) =>
            s.userId === where.userId_skillId.userId &&
            s.skillId === where.userId_skillId.skillId
        );
        const skill = mockSkills.find((sk) => sk.id === create.skillId) || {
          id: create.skillId,
          name: "Kafka",
        };
        if (existing) {
          Object.assign(existing, update, { skill });
        } else {
          existing = {
            id: `us_${Date.now()}_${Math.random()}`,
            ...create,
            skill,
          };
          mockUserSkills.push(existing);
        }
        return existing;
      }),
      create: vi.fn(async ({ data }) => {
        const item = {
          id: `us_${Date.now()}_${Math.random()}`,
          ...data,
          skill: mockSkills.find((sk) => sk.id === data.skillId) || {
            id: data.skillId,
            name: "Skill",
          },
        };
        mockUserSkills.push(item);
        return item;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        mockUserSkills = mockUserSkills.filter(
          (s) => !(s.userId === where.userId && s.skillId === where.skillId)
        );
        return { count: 1 };
      }),
    },
    skill: {
      upsert: vi.fn(async ({ where, update, create }) => {
        let existing = mockSkills.find((s) => s.name === where.name);
        if (!existing) {
          existing = { id: `sk_${Date.now()}_${Math.random()}`, ...create };
          mockSkills.push(existing);
        }
        return existing;
      }),
    },
  };

  const mockCtx: Context = {
    prisma: mockPrisma as any,
    auth: { userId: "clerk_123" } as any,
    user: { id: testUserId, clerkId: "clerk_123", email: "test@example.com", name: "Test User" } as any,
  };

  beforeEach(() => {
    mockProfile = null;
    mockUserSkills = [];
    mockSkills = [];
    vi.clearAllMocks();
  });

  it("updates search preferences correctly", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const updated = await caller.profile.update({
      preferredRoles: ["Backend Engineer", "Distributed Systems"],
      minSalary: 140000,
      maxSalary: 190000,
      remotePreference: "REMOTE",
    });

    expect(updated.preferredRoles).toEqual(["Backend Engineer", "Distributed Systems"]);
    expect(updated.minSalary).toBe(140000);
    expect(updated.remotePreference).toBe("REMOTE");
  });

  it("adds a manual skill with source=MANUAL", async () => {
    const caller = appRouter.createCaller(mockCtx);
    const result: any = await caller.profile.addSkill({
      name: "Kafka",
      proficiency: "Expert",
      yearsOfUse: 4,
    });

    expect(result.source).toBe("MANUAL");
    expect(result.proficiency).toBe("Expert");
    expect(result.skill.name).toBe("Kafka");
  });

  it("preserves manual skills when confirming resume update (AC 6.2)", async () => {
    const caller = appRouter.createCaller(mockCtx);

    // 1. User manually adds Kafka
    await caller.profile.addSkill({
      name: "Kafka",
      proficiency: "Expert",
    });

    // 2. Prepare mock parsed resume containing "TypeScript" and "React" (no Kafka)
    const parseJobId = "job_test_123";
    const storagePath = `resumes/${testUserId}/test.pdf`;
    setParseJob({
      id: parseJobId,
      userId: testUserId,
      storagePath,
      status: "ready",
      createdAt: new Date(),
      extracted: {
        skills: [
          { name: "TypeScript", category: "language" },
          { name: "React", category: "framework" },
        ],
        experienceYears: 5,
        experienceSummary: [],
        projectsSummary: [],
        educationSummary: [],
        professionalSummary: "Experienced engineer",
      },
    });

    // 3. Check preview diff
    const preview = await caller.profile.previewResumeUpdate({ parseJobId });
    expect(preview.status).toBe("ready");
    if (preview.status === "ready" && preview.diff) {
      expect(preview.diff.skillsToAdd).toContain("TypeScript");
      expect(preview.diff.skillsToAdd).toContain("React");
      // Manual skill Kafka must be preserved
      expect(preview.diff.manualSkillsPreserved).toContain("Kafka");
    }

    // 4. Spy on deleteResumeFile
    const deleteSpy = vi.spyOn(storage, "deleteResumeFile").mockResolvedValue();

    // 5. Confirm resume update
    await caller.profile.confirmResumeUpdate({
      parseJobId,
      acceptedFields: [],
    });

    // 6. Verify Kafka is still present in user skills with MANUAL source
    const userSkills = await caller.profile.get();
    const kafkaSkill = userSkills.skills.find((s) => s.skill.name === "Kafka");
    expect(kafkaSkill).toBeDefined();
    expect(kafkaSkill?.source).toBe("MANUAL");

    // 7. Verify resume file was deleted immediately (AC 2.3, ADR-005)
    expect(deleteSpy).toHaveBeenCalledWith(storagePath);
  });

  it("adds and removes work experience with area/location", async () => {
    const caller = appRouter.createCaller(mockCtx);

    const added = await caller.profile.addExperience({
      company: "Stripe",
      title: "Staff Software Engineer",
      location: "San Francisco, CA",
      start: "2021",
      end: "Present",
      highlights: ["Led billing infrastructure team", "Reduced latency by 40%"],
    });

    expect(added.experienceSummary.length).toBe(1);
    expect(added.experienceSummary[0].company).toBe("Stripe");
    expect(added.experienceSummary[0].location).toBe("San Francisco, CA");
    expect(added.experienceSummary[0].title).toBe("Staff Software Engineer");

    // Add a second experience
    const addedSecond = await caller.profile.addExperience({
      company: "GitHub",
      title: "Senior Backend Engineer",
      location: "Remote",
      start: "2018",
      end: "2021",
    });

    expect(addedSecond.experienceSummary.length).toBe(2);
    expect(addedSecond.experienceSummary[0].company).toBe("GitHub");
    expect(addedSecond.experienceSummary[0].location).toBe("Remote");

    // Remove first experience
    const removed = await caller.profile.removeExperience({ index: 0 });
    expect(removed.experienceSummary?.length).toBe(1);
    expect(removed.experienceSummary?.[0].company).toBe("Stripe");
  });
});
