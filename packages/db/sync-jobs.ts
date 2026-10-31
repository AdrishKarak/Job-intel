import { prisma } from "./src";
import { fetchGreenhouseJobs, fetchLeverJobs } from "../ats-connectors/src";

async function main() {
  console.log("Starting job discovery sync script across Greenhouse & Lever companies...");

  // Find or create default seed user for standalone CLI sync
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: "cli_seed_user_001",
        email: "seeker@jobintel.local",
        name: "Active Seeker",
      },
    });
  }

  // Get active companies
  const companies = await prisma.company.findMany({
    where: { active: true },
    take: 5, // Take first 5 for fast, polite demonstration
  });

  console.log(`Polling ${companies.length} companies for candidate ${user.email}...`);

  let totalDiscovered = 0;

  for (const company of companies) {
    if (!company.atsIdentifier) continue;

    console.log(`\nFetching jobs for ${company.name} (${company.atsType}: ${company.atsIdentifier})...`);
    try {
      let jobs = [];
      if (company.atsType === "GREENHOUSE") {
        jobs = await fetchGreenhouseJobs(company.atsIdentifier, company.name);
      } else if (company.atsType === "LEVER") {
        jobs = await fetchLeverJobs(company.atsIdentifier, company.name);
      }

      console.log(`-> Received ${jobs.length} jobs from ${company.name}`);

      // Normalize & store up to 5 jobs per company
      const sample = jobs.slice(0, 5);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);

      for (const raw of sample) {
        const job = await prisma.job.upsert({
          where: {
            userId_companyId_externalId: {
              userId: user.id,
              companyId: company.id,
              externalId: raw.externalId,
            },
          },
          update: {
            title: raw.title,
            description: raw.description,
            location: raw.location,
            remote: raw.remote,
            salaryMin: raw.salaryMin,
            salaryMax: raw.salaryMax,
            applicationUrl: raw.applicationUrl,
            updatedAt: now,
          },
          create: {
            userId: user.id,
            companyId: company.id,
            externalId: raw.externalId,
            title: raw.title,
            description: raw.description,
            location: raw.location,
            remote: raw.remote,
            salaryMin: raw.salaryMin,
            salaryMax: raw.salaryMax,
            applicationUrl: raw.applicationUrl,
            source: raw.source as any,
            status: "DISCOVERED",
            discoveredAt: now,
            expiresAt,
          },
        });

        // Link extracted skills
        for (const skillName of raw.skills) {
          const skill = await prisma.skill.upsert({
            where: { name: skillName },
            update: {},
            create: { name: skillName },
          });

          await prisma.jobSkill.upsert({
            where: {
              jobId_skillId: {
                jobId: job.id,
                skillId: skill.id,
              },
            },
            update: {},
            create: {
              jobId: job.id,
              skillId: skill.id,
              required: true,
            },
          });
        }

        totalDiscovered++;
      }
    } catch (err: any) {
      console.warn(`-> Failed to poll ${company.name}:`, err.message);
    }
  }

  console.log(`\nSync complete! Successfully stored ${totalDiscovered} normalized jobs in Neon PostgreSQL.`);
}

main()
  .catch((e) => {
    console.error("Job sync script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
