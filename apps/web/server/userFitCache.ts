import type { PrismaClient } from "@repo/db";

export interface CachedFitData {
  profile: {
    experienceYears: number | null;
    minExperienceYears: number | null;
    maxExperienceYears: number | null;
    experienceSummary: any;
    preferredLocations: string[];
    preferredRoles: string[];
    remotePreference: string;
  } | null;
  userSkillIds: string[];
  userSkills: { skill: { name: string } }[];
  cachedAt: number;
}

const FIT_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const userFitCache = new Map<string, CachedFitData>();

/**
 * Invalidate cached fit data for a specific user, or clear all when no userId given.
 */
export function invalidateUserFitCache(userId?: string): void {
  if (userId) {
    userFitCache.delete(userId);
  } else {
    userFitCache.clear();
  }
}

/**
 * Fetch candidate profile and user skills with short-term in-memory caching.
 * Prevents redundant sequential DB queries on pagination, dashboard metrics, and job filtering.
 */
export async function getUserFitData(
  userId: string,
  prisma: Pick<PrismaClient, "candidateProfile" | "userSkill">
): Promise<CachedFitData> {
  const cached = userFitCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < FIT_CACHE_TTL_MS) {
    return cached;
  }

  const [profile, skills] = await Promise.all([
    prisma.candidateProfile.findUnique({
      where: { userId },
      select: {
        experienceYears: true,
        minExperienceYears: true,
        maxExperienceYears: true,
        experienceSummary: true,
        preferredLocations: true,
        preferredRoles: true,
        remotePreference: true,
      },
    }),
    prisma.userSkill.findMany({
      where: { userId },
      select: {
        skillId: true,
        skill: { select: { name: true } },
      },
    }),
  ]);

  const fitData: CachedFitData = {
    profile: profile as any,
    userSkillIds: skills.map((s) => s.skillId),
    userSkills: skills.map((s) => ({ skill: { name: s.skill.name } })),
    cachedAt: Date.now(),
  };

  userFitCache.set(userId, fitData);
  return fitData;
}
