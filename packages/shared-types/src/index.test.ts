import { describe, it, expect } from "vitest";
import {
  ResumeParsedOutputSchema,
  CandidateProfileUpdateInputSchema,
  JobFiltersSchema,
  ReportSummarySchema,
} from "./index";

describe("Shared Types & Zod Contracts", () => {
  it("validates ResumeParsedOutputSchema correctly", () => {
    const valid = {
      skills: [{ name: "TypeScript", category: "language" }],
      experienceYears: 4,
      experienceSummary: [
        {
          company: "Acme Corp",
          title: "Senior Engineer",
          start: "2021-01",
          end: null,
          highlights: ["Built real-time distributed systems"],
        },
      ],
      projectsSummary: [
        {
          name: "Open Source Tool",
          description: "A fast parser",
          tech: ["Rust", "Node.js"],
        },
      ],
      educationSummary: [
        {
          school: "Tech University",
          degree: "B.S.",
          field: "Computer Science",
          year: 2020,
        },
      ],
      professionalSummary: "Experienced backend engineer.",
    };

    const parsed = ResumeParsedOutputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("validates JobFiltersSchema", () => {
    const filters = {
      role: "Backend Engineer",
      status: "DISCOVERED" as const,
      minMatchScore: 75,
      remote: true,
    };
    const parsed = JobFiltersSchema.safeParse(filters);
    expect(parsed.success).toBe(true);

    const invalidScore = JobFiltersSchema.safeParse({ minMatchScore: 120 });
    expect(invalidScore.success).toBe(false);
  });

  it("validates ReportSummarySchema defaults", () => {
    const parsed = ReportSummarySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.newJobs).toBe(0);
      expect(parsed.data.bestMatches).toEqual([]);
      expect(parsed.data.skillGaps).toEqual([]);
      expect(parsed.data.statusChanges).toEqual([]);
    }
  });
});
