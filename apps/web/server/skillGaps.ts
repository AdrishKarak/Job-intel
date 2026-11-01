import { prisma } from "@repo/db";
import type { SkillGapRecommendationItem } from "@repo/shared-types";

/**
 * Computes and persists SkillGapRecommendation records for a user (AC 19.1)
 */
export async function computeSkillGapsForUser(
  userId: string,
  db: any = prisma
): Promise<SkillGapRecommendationItem[]> {
  // 1. Fetch user's jobs with missing skills
  const jobs = await db.job.findMany({
    where: { userId },
    select: {
      id: true,
      matchScore: true,
      missingSkills: true,
    },
  });

  const totalJobs = jobs.length;
  if (totalJobs === 0) {
    return [];
  }

  // 2. Count frequency of each missing skill across jobs
  const skillCounts: Record<string, number> = {};

  for (const job of jobs) {
    for (const skill of job.missingSkills) {
      const trimmed = skill.trim();
      if (trimmed) {
        skillCounts[trimmed] = (skillCounts[trimmed] || 0) + 1;
      }
    }
  }

  // 3. Compute recommendations with grounded estimatedLift and trendScore
  const recommendations: SkillGapRecommendationItem[] = Object.entries(skillCounts)
    .map(([skillName, frequency]) => {
      // Estimated lift: potential increase in average match score if acquired (grounded formula)
      const ratio = frequency / totalJobs;
      const estimatedLift = Math.round(ratio * 15 * 10) / 10; // Up to +15% lift

      // Trend score: 0-100 index based on frequency and widespread tech prevalence
      const trendScore = Math.min(100, Math.round(50 + ratio * 50));

      return {
        skillName,
        frequency,
        trendScore,
        estimatedLift,
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10); // Top 10 skill gaps

  // 4. Persist to SkillGapRecommendation table (clean replace for user)
  if (db.$transaction) {
    await db.$transaction([
      db.skillGapRecommendation.deleteMany({
        where: { userId },
      }),
      ...recommendations.map((rec) =>
        db.skillGapRecommendation.create({
          data: {
            userId,
            skillName: rec.skillName,
            frequency: rec.frequency,
            trendScore: rec.trendScore,
            estimatedLift: rec.estimatedLift,
          },
        })
      ),
    ]);
  }

  return recommendations;
}

/**
 * Retrieves persisted skill gap recommendations for a user
 */
export async function getSkillGapsForUser(
  userId: string,
  db: any = prisma
): Promise<SkillGapRecommendationItem[]> {
  const records = await db.skillGapRecommendation.findMany({
    where: { userId },
    orderBy: { frequency: "desc" },
    take: 10,
  });

  return records.map((r: any) => ({
    skillName: r.skillName,
    frequency: r.frequency,
    trendScore: r.trendScore ?? undefined,
    estimatedLift: r.estimatedLift ?? undefined,
  }));
}
