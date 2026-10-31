import { prisma } from "@repo/db";
import { getEmbedding, cosineSimilarity } from "@repo/ai-clients";
import type { ScoredJobOutput } from "@repo/shared-types";

export interface JobMatchingProfileInput {
  skills: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  minSalary?: number | null;
  remotePreference: string;
  professionalSummary?: string | null;
}

export interface RawJobForScoring {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  remote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  skills: string[];
}

/**
 * Calculates skill overlap, matched skills and missing skills
 */
export function calculateSkillFit(
  candidateSkills: string[],
  jobSkills: string[]
): {
  matchedSkills: string[];
  missingSkills: string[];
  score: number;
} {
  const candidateLower = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of jobSkills) {
    const sLower = skill.toLowerCase().trim();
    if (candidateLower.has(sLower)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // If job has no tagged skills, give a neutral 70% score
  if (jobSkills.length === 0) {
    return {
      matchedSkills: [],
      missingSkills: [],
      score: 70,
    };
  }

  const score = Math.round((matchedSkills.length / jobSkills.length) * 100);
  return {
    matchedSkills,
    missingSkills,
    score: Math.max(0, Math.min(100, score)),
  };
}

const GENERIC_TITLE_WORDS = new Set([
  "engineer",
  "developer",
  "architect",
  "specialist",
  "lead",
  "senior",
  "junior",
  "staff",
  "principal",
  "manager",
  "intern",
]);

/**
 * Calculates role / title fit based on preferredRoles
 */
export function calculateRoleFit(
  preferredRoles: string[],
  jobTitle: string
): number {
  if (!preferredRoles || preferredRoles.length === 0) {
    return 75; // Neutral if user specified no preference
  }

  const titleLower = jobTitle.toLowerCase();
  for (const role of preferredRoles) {
    const roleLower = role.toLowerCase().trim();
    if (!roleLower) continue;

    if (titleLower.includes(roleLower) || roleLower.includes(titleLower)) {
      return 100;
    }

    // Significant token overlap check
    const roleTokens = roleLower.split(/\s+/).filter(Boolean);
    const significantTokens = roleTokens.filter((t) => !GENERIC_TITLE_WORDS.has(t));

    if (significantTokens.length > 0) {
      const matchedSignificant = significantTokens.filter((t) => titleLower.includes(t));
      if (matchedSignificant.length / significantTokens.length >= 0.5) {
        return 65;
      }
    } else {
      const matchedTokens = roleTokens.filter((t) => titleLower.includes(t));
      if (matchedTokens.length / roleTokens.length >= 0.5) {
        return 65;
      }
    }
  }

  return 35;
}

/**
 * Calculates location and remote compatibility
 */
export function calculateLocationFit(
  remotePreference: string,
  preferredLocations: string[],
  jobLocation?: string | null,
  isRemote = false
): number {
  const locLower = (jobLocation || "").toLowerCase();

  switch (remotePreference) {
    case "REMOTE":
      if (isRemote || locLower.includes("remote")) return 100;
      if (preferredLocations.some((pl) => locLower.includes(pl.toLowerCase()))) return 75;
      return 30;

    case "HYBRID":
      if (isRemote || locLower.includes("remote")) return 90;
      if (preferredLocations.some((pl) => locLower.includes(pl.toLowerCase()))) return 100;
      return 50;

    case "ONSITE":
      if (preferredLocations.some((pl) => locLower.includes(pl.toLowerCase()))) return 100;
      if (isRemote) return 80;
      return 40;

    case "NO_PREFERENCE":
    default:
      return 100;
  }
}

/**
 * Calculates salary fit against candidate minSalary
 */
export function calculateSalaryFit(
  candidateMinSalary?: number | null,
  jobSalaryMin?: number | null,
  jobSalaryMax?: number | null
): number {
  if (!candidateMinSalary) {
    return 100; // No minimum requirement
  }

  // If job has unlisted compensation (common in tech), don't penalize harshly
  if (!jobSalaryMin && !jobSalaryMax) {
    return 80;
  }

  const effectiveMax = jobSalaryMax || jobSalaryMin || 0;
  if (effectiveMax >= candidateMinSalary) {
    return 100;
  }

  // Below expectations, scale proportionally
  const ratio = (effectiveMax / candidateMinSalary) * 100;
  return Math.max(20, Math.min(100, Math.round(ratio)));
}

/**
 * Generates faithful, grounded AI explanation (AC 12.1, Guardrails §2)
 */
export function generateGroundedExplanation(
  matchScore: number,
  matchedSkills: string[],
  missingSkills: string[]
): string {
  if (matchScore >= 80) {
    const matchedText =
      matchedSkills.length > 0
        ? `Strong alignment across ${matchedSkills.slice(0, 3).join(", ")}.`
        : "Strong overall profile alignment.";
    const missingText =
      missingSkills.length > 0
        ? ` Recommended focus on ${missingSkills[0]} to maximize fit.`
        : "";
    return `Excellent match (${matchScore}%). ${matchedText}${missingText}`;
  }

  if (matchScore >= 70) {
    const matchedText =
      matchedSkills.length > 0
        ? `Matches key capabilities in ${matchedSkills.slice(0, 3).join(", ")}.`
        : "Good foundation of matching skills.";
    const missingText =
      missingSkills.length > 0
        ? ` Consider adding ${missingSkills.slice(0, 2).join(" and ")} to your profile.`
        : "";
    return `Solid match (${matchScore}%). ${matchedText}${missingText}`;
  }

  const missingText =
    missingSkills.length > 0
      ? `Gap identified in ${missingSkills.slice(0, 2).join(" and ")}.`
      : "Low alignment with stated preferences.";
  return `Moderate fit (${matchScore}%). ${missingText}`;
}

/**
 * Scores a batch of jobs for a user using rule-based fit + pgvector embeddings (ADR-003, ADR-010)
 */
export async function scoreJobsForUser(
  userId: string,
  jobIds?: string[]
): Promise<{
  scored: ScoredJobOutput[];
  failed: { jobId: string; reason: string }[];
}> {
  // 1. Load candidate profile and skills
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
  });

  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
  });

  const candidateSkills = userSkills.map((us) => us.skill.name);
  const candidateProfileInput: JobMatchingProfileInput = {
    skills: candidateSkills,
    preferredRoles: profile?.preferredRoles ?? [],
    preferredLocations: profile?.preferredLocations ?? [],
    minSalary: profile?.minSalary,
    remotePreference: profile?.remotePreference ?? "NO_PREFERENCE",
    professionalSummary: profile?.professionalSummary,
  };

  // Generate candidate profile embedding if needed
  const profileText = [
    candidateProfileInput.preferredRoles.join(" "),
    candidateSkills.join(" "),
    candidateProfileInput.professionalSummary || "",
  ]
    .filter(Boolean)
    .join(" ");

  const candidateEmbedding = await getEmbedding(profileText || "Software Engineer");

  // 2. Load target jobs
  const where: any = { userId };
  if (jobIds && jobIds.length > 0) {
    where.id = { in: jobIds };
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      jobSkills: {
        include: { skill: true },
      },
    },
  });

  const scored: ScoredJobOutput[] = [];
  const failed: { jobId: string; reason: string }[] = [];

  for (const job of jobs) {
    try {
      const jobSkillsList = job.jobSkills.map((js) => js.skill.name);

      // A. Rule-based scoring signals
      const { matchedSkills, missingSkills, score: skillFitScore } = calculateSkillFit(
        candidateSkills,
        jobSkillsList
      );
      const roleFitScore = calculateRoleFit(
        candidateProfileInput.preferredRoles,
        job.title
      );
      const locationFitScore = calculateLocationFit(
        candidateProfileInput.remotePreference,
        candidateProfileInput.preferredLocations,
        job.location,
        job.remote
      );
      const salaryFitScore = calculateSalaryFit(
        candidateProfileInput.minSalary,
        job.salaryMin,
        job.salaryMax
      );

      // Weighted rule-based score
      const ruleScore =
        skillFitScore * 0.5 +
        roleFitScore * 0.2 +
        locationFitScore * 0.15 +
        salaryFitScore * 0.15;

      // B. Semantic similarity refining signal (ADR-003, ADR-010)
      let semanticScore = ruleScore; // default fallback
      try {
        const jobText = `${job.title} ${job.description.slice(0, 2000)}`;
        const jobEmbedding = await getEmbedding(jobText);
        const sim = cosineSimilarity(candidateEmbedding, jobEmbedding);
        semanticScore = Math.round(sim * 100);
      } catch (embErr) {
        console.warn(`Semantic similarity calculation failed for job ${job.id}:`, embErr);
      }

      // C. Composite final score (0–100)
      const finalScore = Math.max(
        0,
        Math.min(100, Math.round(ruleScore * 0.7 + semanticScore * 0.3))
      );

      const aiExplanation = generateGroundedExplanation(
        finalScore,
        matchedSkills,
        missingSkills
      );

      // D. Persist to DB
      await prisma.job.update({
        where: { id: job.id },
        data: {
          matchScore: finalScore,
          matchedSkills,
          missingSkills,
          aiExplanation,
        },
      });

      scored.push({
        jobId: job.id,
        matchScore: finalScore,
        matchedSkills,
        missingSkills,
        aiExplanation,
      });
    } catch (err: any) {
      console.error(`Failed to score job ${job.id}:`, err);
      failed.push({
        jobId: job.id,
        reason: err.message || "Scoring calculation failed",
      });
    }
  }

  return { scored, failed };
}
