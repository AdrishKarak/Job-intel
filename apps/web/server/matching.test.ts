import { describe, it, expect } from "vitest";
import {
  calculateSkillFit,
  calculateRoleFit,
  calculateLocationFit,
  calculateSalaryFit,
  generateGroundedExplanation,
} from "./matching";

describe("Matching Engine (Phase 4)", () => {
  describe("calculateSkillFit", () => {
    it("computes 100% when all job skills are matched", () => {
      const candidateSkills = ["TypeScript", "React", "PostgreSQL", "Node.js"];
      const jobSkills = ["React", "TypeScript"];
      const result = calculateSkillFit(candidateSkills, jobSkills);

      expect(result.score).toBe(100);
      expect(result.matchedSkills).toEqual(["React", "TypeScript"]);
      expect(result.missingSkills).toEqual([]);
    });

    it("identifies missing skills and calculates ratio", () => {
      const candidateSkills = ["TypeScript", "Node.js"];
      const jobSkills = ["TypeScript", "React", "Docker", "AWS"];
      const result = calculateSkillFit(candidateSkills, jobSkills);

      expect(result.score).toBe(25);
      expect(result.matchedSkills).toEqual(["TypeScript"]);
      expect(result.missingSkills).toEqual(["React", "Docker", "AWS"]);
    });

    it("returns neutral 70% when job has no tagged skills", () => {
      const result = calculateSkillFit(["React"], []);
      expect(result.score).toBe(70);
      expect(result.matchedSkills).toEqual([]);
      expect(result.missingSkills).toEqual([]);
    });
  });

  describe("calculateRoleFit", () => {
    it("gives 100 for exact or contained title match", () => {
      expect(calculateRoleFit(["Frontend Engineer"], "Senior Frontend Engineer")).toBe(100);
      expect(calculateRoleFit(["Staff Backend Engineer"], "Backend Engineer")).toBe(100);
    });

    it("gives 65 for token overlap >= 50%", () => {
      expect(calculateRoleFit(["Full Stack Software Engineer"], "Full Stack Developer")).toBe(65);
    });

    it("gives 35 for low overlap mismatch", () => {
      expect(calculateRoleFit(["iOS Engineer"], "DevOps Engineer")).toBe(35);
    });

    it("gives neutral 75 when candidate has no preferred roles", () => {
      expect(calculateRoleFit([], "DevOps Engineer")).toBe(75);
    });
  });

  describe("calculateLocationFit", () => {
    it("rewards remote positions for REMOTE preference", () => {
      expect(calculateLocationFit("REMOTE", ["San Francisco"], "Remote", true)).toBe(100);
      expect(calculateLocationFit("REMOTE", ["San Francisco"], "San Francisco, CA", false)).toBe(75);
      expect(calculateLocationFit("REMOTE", ["San Francisco"], "New York, NY", false)).toBe(30);
    });

    it("evaluates HYBRID preference correctly", () => {
      expect(calculateLocationFit("HYBRID", ["Seattle"], "Seattle, WA", false)).toBe(100);
      expect(calculateLocationFit("HYBRID", ["Seattle"], "Anywhere", true)).toBe(90);
      expect(calculateLocationFit("HYBRID", ["Seattle"], "Austin, TX", false)).toBe(50);
    });

    it("evaluates NO_PREFERENCE as 100", () => {
      expect(calculateLocationFit("NO_PREFERENCE", [], "London", false)).toBe(100);
    });
  });

  describe("calculateSalaryFit", () => {
    it("returns 100 if candidate has no min salary requirement", () => {
      expect(calculateSalaryFit(null, 100000, 150000)).toBe(100);
    });

    it("returns 80 if job salary is unlisted", () => {
      expect(calculateSalaryFit(120000, null, null)).toBe(80);
    });

    it("returns 100 if job compensation meets or exceeds requirement", () => {
      expect(calculateSalaryFit(140000, 130000, 160000)).toBe(100);
    });

    it("scales proportionally down when below requirement", () => {
      const score = calculateSalaryFit(200000, 100000, 120000);
      expect(score).toBe(60); // 120k / 200k = 60%
    });
  });

  describe("generateGroundedExplanation", () => {
    it("generates grounded explanation for high match (>=80)", () => {
      const explanation = generateGroundedExplanation(88, ["TypeScript", "React"], ["GraphQL"]);
      expect(explanation).toContain("Excellent match (88%)");
      expect(explanation).toContain("TypeScript, React");
      expect(explanation).toContain("GraphQL");
    });

    it("generates grounded explanation for solid match (70-79)", () => {
      const explanation = generateGroundedExplanation(74, ["Go"], ["Kubernetes"]);
      expect(explanation).toContain("Solid match (74%)");
      expect(explanation).toContain("Go");
      expect(explanation).toContain("Kubernetes");
    });

    it("generates grounded explanation for moderate match (<70)", () => {
      const explanation = generateGroundedExplanation(55, [], ["Java", "Spring"]);
      expect(explanation).toContain("Moderate fit (55%)");
      expect(explanation).toContain("Java and Spring");
    });
  });
});
