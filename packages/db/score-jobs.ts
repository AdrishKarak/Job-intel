import { prisma } from "./src";
import { getEmbedding, cosineSimilarity } from "../ai-clients/src";
import {
  calculateSkillFit,
  calculateRoleFit,
  calculateLocationFit,
  calculateSalaryFit,
  generateGroundedExplanation,
} from "../../apps/web/server/matching";

async function main() {
  console.log("Starting batch job scoring for seed user...");

  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found in database");
  }

  console.log(`Candidate: ${user.name} (${user.email}, ID: ${user.id})`);

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
  });

  const userSkills = await prisma.userSkill.findMany({
    where: { userId: user.id },
    include: { skill: true },
  });

  const candidateSkills = userSkills.map((us) => us.skill.name);
  console.log("Candidate Skills:", candidateSkills);
  console.log("Preferred Roles:", profile?.preferredRoles);
  console.log("Preferred Locations:", profile?.preferredLocations);

  const profileText = [
    (profile?.preferredRoles || []).join(" "),
    candidateSkills.join(" "),
    profile?.professionalSummary || "",
  ]
    .filter(Boolean)
    .join(" ");

  const candidateEmbedding = await getEmbedding(profileText || "Software Engineer");

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    include: {
      jobSkills: {
        include: { skill: true },
      },
    },
  });

  console.log(`Evaluating fit for ${jobs.length} jobs in user's pipeline...`);

  let scoredCount = 0;

  for (const job of jobs) {
    const jobSkillsList = job.jobSkills.map((js) => js.skill.name);

    const { matchedSkills, missingSkills, score: skillFitScore } = calculateSkillFit(
      candidateSkills,
      jobSkillsList
    );
    const roleFitScore = calculateRoleFit(
      profile?.preferredRoles || [],
      job.title
    );
    const locationFitScore = calculateLocationFit(
      profile?.remotePreference || "NO_PREFERENCE",
      profile?.preferredLocations || [],
      job.location,
      job.remote
    );
    const salaryFitScore = calculateSalaryFit(
      profile?.minSalary,
      job.salaryMin,
      job.salaryMax
    );

    const ruleScore =
      skillFitScore * 0.5 +
      roleFitScore * 0.2 +
      locationFitScore * 0.15 +
      salaryFitScore * 0.15;

    let semanticScore = ruleScore;
    try {
      const jobText = `${job.title} ${job.description.slice(0, 2000)}`;
      const jobEmbedding = await getEmbedding(jobText);
      const sim = cosineSimilarity(candidateEmbedding, jobEmbedding);
      semanticScore = Math.round(sim * 100);
    } catch {
      // Fallback to ruleScore
    }

    const finalScore = Math.max(
      0,
      Math.min(100, Math.round(ruleScore * 0.7 + semanticScore * 0.3))
    );

    const aiExplanation = generateGroundedExplanation(
      finalScore,
      matchedSkills,
      missingSkills
    );

    await prisma.job.update({
      where: { id: job.id },
      data: {
        matchScore: finalScore,
        matchedSkills,
        missingSkills,
        aiExplanation,
      },
    });

    scoredCount++;
    console.log(
      `✓ [${finalScore}%] ${job.title} (${matchedSkills.length} matched, ${missingSkills.length} missing)`
    );
  }

  console.log(`\nSuccessfully scored ${scoredCount} jobs for ${user.email}!`);
}

main()
  .catch((err) => {
    console.error("Scoring failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
