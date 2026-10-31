import { prisma, AtsType } from "./src";

const COMPANIES: Array<{
  name: string;
  atsType: AtsType;
  atsIdentifier: string;
  careerPageUrl: string;
}> = [
  // Greenhouse Companies
  {
    name: "Stripe",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "stripe",
    careerPageUrl: "https://stripe.com/jobs",
  },
  {
    name: "Figma",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "figma",
    careerPageUrl: "https://www.figma.com/careers",
  },
  {
    name: "Airbnb",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "airbnb",
    careerPageUrl: "https://careers.airbnb.com",
  },
  {
    name: "Datadog",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "datadog",
    careerPageUrl: "https://www.datadoghq.com/careers",
  },
  {
    name: "Discord",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "discord",
    careerPageUrl: "https://discord.com/careers",
  },
  {
    name: "Cloudflare",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "cloudflare",
    careerPageUrl: "https://www.cloudflare.com/careers",
  },
  {
    name: "Coinbase",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "coinbase",
    careerPageUrl: "https://www.coinbase.com/careers",
  },
  {
    name: "Plaid",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "plaid",
    careerPageUrl: "https://plaid.com/careers",
  },
  {
    name: "Ramp",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "ramp",
    careerPageUrl: "https://ramp.com/careers",
  },
  {
    name: "DoorDash",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "doordash",
    careerPageUrl: "https://careers.doordash.com",
  },
  {
    name: "GitLab",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "gitlab",
    careerPageUrl: "https://about.gitlab.com/jobs",
  },
  {
    name: "Okta",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "okta",
    careerPageUrl: "https://www.okta.com/company/careers",
  },
  {
    name: "Elastic",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "elastic",
    careerPageUrl: "https://www.elastic.co/about/careers",
  },
  {
    name: "Block",
    atsType: AtsType.GREENHOUSE,
    atsIdentifier: "block",
    careerPageUrl: "https://block.xyz/careers",
  },
  // Lever Companies
  {
    name: "Netlify",
    atsType: AtsType.LEVER,
    atsIdentifier: "netlify",
    careerPageUrl: "https://www.netlify.com/careers",
  },
  {
    name: "Postman",
    atsType: AtsType.LEVER,
    atsIdentifier: "postman",
    careerPageUrl: "https://www.postman.com/company/careers",
  },
  {
    name: "Automattic",
    atsType: AtsType.LEVER,
    atsIdentifier: "automattic",
    careerPageUrl: "https://automattic.com/work-with-us",
  },
  {
    name: "Sourcegraph",
    atsType: AtsType.LEVER,
    atsIdentifier: "sourcegraph",
    careerPageUrl: "https://sourcegraph.com/jobs",
  },
  {
    name: "Palantir",
    atsType: AtsType.LEVER,
    atsIdentifier: "palantir",
    careerPageUrl: "https://www.palantir.com/careers",
  },
  {
    name: "Benchling",
    atsType: AtsType.LEVER,
    atsIdentifier: "benchling",
    careerPageUrl: "https://www.benchling.com/careers",
  },
  {
    name: "Replicate",
    atsType: AtsType.LEVER,
    atsIdentifier: "replicate",
    careerPageUrl: "https://replicate.com/jobs",
  },
  {
    name: "Mixpanel",
    atsType: AtsType.LEVER,
    atsIdentifier: "mixpanel",
    careerPageUrl: "https://mixpanel.com/jobs",
  },
  {
    name: "Affirm",
    atsType: AtsType.LEVER,
    atsIdentifier: "affirm",
    careerPageUrl: "https://www.affirm.com/careers",
  },
  {
    name: "Kustomer",
    atsType: AtsType.LEVER,
    atsIdentifier: "kustomer",
    careerPageUrl: "https://www.kustomer.com/careers",
  },
  {
    name: "Docker",
    atsType: AtsType.LEVER,
    atsIdentifier: "docker",
    careerPageUrl: "https://www.docker.com/careers",
  },
];

async function main() {
  console.log(`Seeding ${COMPANIES.length} target companies across Greenhouse & Lever...`);

  let count = 0;
  for (const comp of COMPANIES) {
    await prisma.company.upsert({
      where: { name: comp.name },
      update: {
        atsType: comp.atsType,
        atsIdentifier: comp.atsIdentifier,
        careerPageUrl: comp.careerPageUrl,
        active: true,
      },
      create: {
        name: comp.name,
        atsType: comp.atsType,
        atsIdentifier: comp.atsIdentifier,
        careerPageUrl: comp.careerPageUrl,
        active: true,
      },
    });
    count++;
  }

  console.log(`Successfully seeded ${count} active companies.`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
