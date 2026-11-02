import { describe, it, expect } from "vitest";
import {
  evaluateJobMatch,
  resolveCandidateExperienceYears,
  extractJobMinYears,
  filterExperienceWise,
  filterLocationWise,
  filterPositionAndSkillsWise,
} from "./jobFilterEngine";

describe("JobFilterEngine: 3-Stage Filtering (Experience -> Location -> Skill & Position)", () => {
  const baseProfile = {
    experienceYears: 4,
    preferredRoles: ["Backend Engineer", "Software Engineer"],
    preferredLocations: ["San Francisco, CA", "Remote"],
    remotePreference: "REMOTE" as const,
    userSkills: ["Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"],
  };

  describe("Stage 1: Experience-wise Filtering", () => {
    it("rejects internships for experienced candidates (>= 3 years)", () => {
      const job = {
        title: "Software Engineering Intern - Summer 2025",
        location: "Remote",
        remote: true,
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("EXPERIENCE");
      expect(result.reasons[0]).toContain("internship");
    });

    it("rejects VP and Director roles for mid-level candidates (< 6 years)", () => {
      const job = {
        title: "VP of Engineering & Infrastructure",
        location: "Remote",
        remote: true,
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("EXPERIENCE");
      expect(result.reasons[0]).toContain("Executive");
    });

    it("rejects 10+ year requirements for candidates with 4 years", () => {
      const job = {
        title: "Principal Distributed Systems Architect",
        description: "Requires at least 10+ years of professional backend experience.",
        location: "Remote",
        remote: true,
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("EXPERIENCE");
    });

    it("passes matching experience roles (e.g. Senior Backend Engineer with 4-5 yrs)", () => {
      const res = filterExperienceWise(
        { title: "Senior Backend Engineer", description: "3-5 years experience with Node" },
        4
      );
      expect(res.passed).toBe(true);
    });

    it("optimizes search with preferred experience range [minExperienceYears, maxExperienceYears]", () => {
      // Preferred range: 0 to 2 years (e.g. Graduate Engineer Trainee / Associate Engineer)
      const earlyCareerCriteria = {
        minExperienceYears: 0,
        maxExperienceYears: 2,
        preferredRoles: ["Graduate Engineer Trainee", "Associate Engineer"],
      };

      // Job requiring 5+ years should be rejected by the agent
      const seniorJob = {
        title: "Senior Backend Architect",
        description: "Requires minimum 5+ years of production experience",
      };
      const seniorResult = filterExperienceWise(seniorJob, 1, earlyCareerCriteria);
      expect(seniorResult.passed).toBe(false);
      expect(seniorResult.reason).toContain("exceeding candidate's preferred search maximum");

      // Graduate role requiring 0-1 years should pass
      const gradJob = {
        title: "Graduate Engineer Trainee",
        description: "0 to 1 years of experience, fresh engineering graduates welcome",
      };
      const gradResult = filterExperienceWise(gradJob, 1, earlyCareerCriteria);
      expect(gradResult.passed).toBe(true);

      // Mid-career applicant with minExperienceYears: 4 should reject internship
      const midCriteria = {
        minExperienceYears: 4,
        maxExperienceYears: 8,
      };
      const internJob = {
        title: "Software Engineering Intern",
      };
      const internResult = filterExperienceWise(internJob, 5, midCriteria);
      expect(internResult.passed).toBe(false);
      expect(internResult.reason).toContain("below candidate's preferred search minimum");
    });
  });

  describe("Stage 2: Location-wise Filtering", () => {
    it("rejects on-site jobs when candidate chose Remote Only", () => {
      const job = {
        title: "Backend Engineer",
        location: "Austin, TX (On-site)",
        remote: false,
        skills: ["Node.js", "TypeScript"],
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("LOCATION");
      expect(result.reasons[0]).toContain("Remote Only");
    });

    it("rejects jobs in unrelated cities when candidate has specific preferred locations and is not remote", () => {
      const onSiteProfile = {
        ...baseProfile,
        remotePreference: "ONSITE" as const,
        preferredLocations: ["San Francisco, CA"],
      };

      const job = {
        title: "Backend Engineer",
        location: "Berlin, Germany",
        remote: false,
        skills: ["Node.js", "TypeScript"],
      };

      const result = evaluateJobMatch(job, onSiteProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("LOCATION");
    });

    it("passes remote jobs for remote preference candidates", () => {
      const job = {
        title: "Backend Engineer",
        location: "Remote - US",
        remote: true,
        skills: ["Node.js"],
      };

      const result = filterLocationWise(job, baseProfile);
      expect(result.passed).toBe(true);
    });
  });

  describe("Stage 3: Position & Skill-wise Filtering", () => {
    it("rejects completely unrelated occupational domains (e.g. Sales, HR, Medical)", () => {
      const job = {
        title: "Enterprise Account Executive - SaaS Sales",
        location: "Remote",
        remote: true,
        skills: ["Communication", "Negotiation"],
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("POSITION");
      expect(result.reasons[0]).toContain("occupational domain");
    });

    it("rejects jobs that don't match any preferred roles", () => {
      const job = {
        title: "Senior Product Designer",
        location: "Remote",
        remote: true,
        skills: ["Figma", "Design Systems"],
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("POSITION");
    });

    it("rejects jobs with 0 skill overlap", () => {
      const job = {
        title: "Backend Engineer (Ruby & Rails)",
        location: "Remote",
        remote: true,
        skills: ["Ruby", "Rails", "Sidekiq"],
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(false);
      expect(result.failedStage).toBe("POSITION");
      expect(result.reasons[0]).toContain("orthogonal skill set");
    });

    it("approves perfect matches across all 3 stages", () => {
      const job = {
        title: "Senior Backend Engineer",
        description: "Building scalable cloud services with Node.js and TypeScript on AWS.",
        location: "Remote - US",
        remote: true,
        skills: ["Node.js", "TypeScript", "PostgreSQL", "AWS"],
      };

      const result = evaluateJobMatch(job, baseProfile);
      expect(result.passed).toBe(true);
      expect(result.failedStage).toBeUndefined();
      expect(result.reasons.length).toBe(0);
    });

    it("respects 0 years experience as fresher/entry-level without overriding with history", () => {
      const fresherProfile = {
        experienceYears: 0,
        experienceSummary: [{ company: "Old Co", title: "Intern", start: "2020", end: "2021" }],
      };
      expect(resolveCandidateExperienceYears(fresherProfile)).toBe(0);
    });

    it("respects high experience scroller settings up to 100 years", () => {
      expect(resolveCandidateExperienceYears({ experienceYears: 100 })).toBe(100);
    });
  });
});
