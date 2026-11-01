import { prisma, AtsType } from "./src";

export const COMPANIES: Array<{
  name: string;
  atsType: AtsType;
  atsIdentifier: string;
  careerPageUrl: string;
}> = [
  // ─── Greenhouse (Premier Tech Companies) ───
  { name: "Stripe", atsType: AtsType.GREENHOUSE, atsIdentifier: "stripe", careerPageUrl: "https://stripe.com/jobs" },
  { name: "Figma", atsType: AtsType.GREENHOUSE, atsIdentifier: "figma", careerPageUrl: "https://www.figma.com/careers" },
  { name: "Airbnb", atsType: AtsType.GREENHOUSE, atsIdentifier: "airbnb", careerPageUrl: "https://careers.airbnb.com" },
  { name: "Datadog", atsType: AtsType.GREENHOUSE, atsIdentifier: "datadog", careerPageUrl: "https://www.datadoghq.com/careers" },
  { name: "Discord", atsType: AtsType.GREENHOUSE, atsIdentifier: "discord", careerPageUrl: "https://discord.com/careers" },
  { name: "Cloudflare", atsType: AtsType.GREENHOUSE, atsIdentifier: "cloudflare", careerPageUrl: "https://www.cloudflare.com/careers" },
  { name: "Coinbase", atsType: AtsType.GREENHOUSE, atsIdentifier: "coinbase", careerPageUrl: "https://www.coinbase.com/careers" },
  { name: "Plaid", atsType: AtsType.GREENHOUSE, atsIdentifier: "plaid", careerPageUrl: "https://plaid.com/careers" },
  { name: "Ramp", atsType: AtsType.GREENHOUSE, atsIdentifier: "ramp", careerPageUrl: "https://ramp.com/careers" },
  { name: "DoorDash", atsType: AtsType.GREENHOUSE, atsIdentifier: "doordash", careerPageUrl: "https://careers.doordash.com" },
  { name: "GitLab", atsType: AtsType.GREENHOUSE, atsIdentifier: "gitlab", careerPageUrl: "https://about.gitlab.com/jobs" },
  { name: "Okta", atsType: AtsType.GREENHOUSE, atsIdentifier: "okta", careerPageUrl: "https://www.okta.com/company/careers" },
  { name: "Elastic", atsType: AtsType.GREENHOUSE, atsIdentifier: "elastic", careerPageUrl: "https://www.elastic.co/about/careers" },
  { name: "Block", atsType: AtsType.GREENHOUSE, atsIdentifier: "block", careerPageUrl: "https://block.xyz/careers" },
  { name: "HashiCorp", atsType: AtsType.GREENHOUSE, atsIdentifier: "hashicorp", careerPageUrl: "https://www.hashicorp.com/careers" },
  { name: "Twilio", atsType: AtsType.GREENHOUSE, atsIdentifier: "twilio", careerPageUrl: "https://www.twilio.com/company/jobs" },
  { name: "Snowflake", atsType: AtsType.GREENHOUSE, atsIdentifier: "snowflake", careerPageUrl: "https://careers.snowflake.com" },
  { name: "Box", atsType: AtsType.GREENHOUSE, atsIdentifier: "box", careerPageUrl: "https://www.box.com/careers" },
  { name: "Atlassian", atsType: AtsType.GREENHOUSE, atsIdentifier: "atlassian", careerPageUrl: "https://www.atlassian.com/company/careers" },
  { name: "GitHub", atsType: AtsType.GREENHOUSE, atsIdentifier: "github", careerPageUrl: "https://github.com/about/careers" },
  { name: "Asana", atsType: AtsType.GREENHOUSE, atsIdentifier: "asana", careerPageUrl: "https://asana.com/jobs" },
  { name: "Zapier", atsType: AtsType.GREENHOUSE, atsIdentifier: "zapier", careerPageUrl: "https://zapier.com/jobs" },
  { name: "Miro", atsType: AtsType.GREENHOUSE, atsIdentifier: "miro", careerPageUrl: "https://miro.com/careers" },
  { name: "Reddit", atsType: AtsType.GREENHOUSE, atsIdentifier: "reddit", careerPageUrl: "https://www.redditinc.com/careers" },
  { name: "Pinterest", atsType: AtsType.GREENHOUSE, atsIdentifier: "pinterest", careerPageUrl: "https://www.pinterestcareers.com" },
  { name: "Robinhood", atsType: AtsType.GREENHOUSE, atsIdentifier: "robinhood", careerPageUrl: "https://robinhood.com/us/en/careers" },
  { name: "Uber", atsType: AtsType.GREENHOUSE, atsIdentifier: "uber", careerPageUrl: "https://www.uber.com/us/en/careers" },
  { name: "Lyft", atsType: AtsType.GREENHOUSE, atsIdentifier: "lyft", careerPageUrl: "https://www.lyft.com/careers" },
  { name: "Instacart", atsType: AtsType.GREENHOUSE, atsIdentifier: "instacart", careerPageUrl: "https://instacart.careers" },
  { name: "Databricks", atsType: AtsType.GREENHOUSE, atsIdentifier: "databricks", careerPageUrl: "https://www.databricks.com/company/careers" },
  { name: "Chime", atsType: AtsType.GREENHOUSE, atsIdentifier: "chime", careerPageUrl: "https://www.chime.com/careers" },
  { name: "Braze", atsType: AtsType.GREENHOUSE, atsIdentifier: "braze", careerPageUrl: "https://www.braze.com/about/careers" },
  { name: "Gusto", atsType: AtsType.GREENHOUSE, atsIdentifier: "gusto", careerPageUrl: "https://gusto.com/about/careers" },
  { name: "Webflow", atsType: AtsType.GREENHOUSE, atsIdentifier: "webflow", careerPageUrl: "https://webflow.com/careers" },
  { name: "Toast", atsType: AtsType.GREENHOUSE, atsIdentifier: "toast", careerPageUrl: "https://careers.toasttab.com" },

  // ─── Lever (High-Growth Tech Leaders) ───
  { name: "Netlify", atsType: AtsType.LEVER, atsIdentifier: "netlify", careerPageUrl: "https://www.netlify.com/careers" },
  { name: "Postman", atsType: AtsType.LEVER, atsIdentifier: "postman", careerPageUrl: "https://www.postman.com/company/careers" },
  { name: "Automattic", atsType: AtsType.LEVER, atsIdentifier: "automattic", careerPageUrl: "https://automattic.com/work-with-us" },
  { name: "Sourcegraph", atsType: AtsType.LEVER, atsIdentifier: "sourcegraph", careerPageUrl: "https://sourcegraph.com/jobs" },
  { name: "Palantir", atsType: AtsType.LEVER, atsIdentifier: "palantir", careerPageUrl: "https://www.palantir.com/careers" },
  { name: "Benchling", atsType: AtsType.LEVER, atsIdentifier: "benchling", careerPageUrl: "https://www.benchling.com/careers" },
  { name: "Replicate", atsType: AtsType.LEVER, atsIdentifier: "replicate", careerPageUrl: "https://replicate.com/jobs" },
  { name: "Mixpanel", atsType: AtsType.LEVER, atsIdentifier: "mixpanel", careerPageUrl: "https://mixpanel.com/jobs" },
  { name: "Affirm", atsType: AtsType.LEVER, atsIdentifier: "affirm", careerPageUrl: "https://www.affirm.com/careers" },
  { name: "Kustomer", atsType: AtsType.LEVER, atsIdentifier: "kustomer", careerPageUrl: "https://www.kustomer.com/careers" },
  { name: "Docker", atsType: AtsType.LEVER, atsIdentifier: "docker", careerPageUrl: "https://www.docker.com/careers" },
  { name: "Eventbrite", atsType: AtsType.LEVER, atsIdentifier: "eventbrite", careerPageUrl: "https://www.eventbrite.com/careers" },
  { name: "FullStory", atsType: AtsType.LEVER, atsIdentifier: "fullstory", careerPageUrl: "https://www.fullstory.com/careers" },
  { name: "Clearbit", atsType: AtsType.LEVER, atsIdentifier: "clearbit", careerPageUrl: "https://clearbit.com/careers" },
  { name: "Modern Treasury", atsType: AtsType.LEVER, atsIdentifier: "moderntreasury", careerPageUrl: "https://www.moderntreasury.com/careers" },
  { name: "Sendbird", atsType: AtsType.LEVER, atsIdentifier: "sendbird", careerPageUrl: "https://sendbird.com/careers" },
  { name: "Dialpad", atsType: AtsType.LEVER, atsIdentifier: "dialpad", careerPageUrl: "https://www.dialpad.com/careers" },
  { name: "Ironclad", atsType: AtsType.LEVER, atsIdentifier: "ironclad", careerPageUrl: "https://ironcladapp.com/careers" },
  { name: "Carta", atsType: AtsType.LEVER, atsIdentifier: "carta", careerPageUrl: "https://carta.com/careers" },
  { name: "Medallia", atsType: AtsType.LEVER, atsIdentifier: "medallia", careerPageUrl: "https://www.medallia.com/careers" },

  // ─── Ashby (Modern Engineering Hubs) ───
  { name: "Linear", atsType: AtsType.ASHBY, atsIdentifier: "linear", careerPageUrl: "https://linear.app/careers" },
  { name: "Vercel", atsType: AtsType.ASHBY, atsIdentifier: "vercel", careerPageUrl: "https://vercel.com/careers" },
  { name: "Supabase", atsType: AtsType.ASHBY, atsIdentifier: "supabase", careerPageUrl: "https://supabase.com/careers" },
  { name: "Cursor", atsType: AtsType.ASHBY, atsIdentifier: "cursor", careerPageUrl: "https://www.cursor.com/careers" },
  { name: "Modal", atsType: AtsType.ASHBY, atsIdentifier: "modal", careerPageUrl: "https://modal.com/careers" },
  { name: "Temporal", atsType: AtsType.ASHBY, atsIdentifier: "temporal", careerPageUrl: "https://temporal.io/careers" },
  { name: "ElevenLabs", atsType: AtsType.ASHBY, atsIdentifier: "elevenlabs", careerPageUrl: "https://elevenlabs.io/careers" },
  { name: "Perplexity", atsType: AtsType.ASHBY, atsIdentifier: "perplexity", careerPageUrl: "https://www.perplexity.ai/careers" },
  { name: "Deel", atsType: AtsType.ASHBY, atsIdentifier: "deel", careerPageUrl: "https://www.deel.com/careers" },
  { name: "Runway", atsType: AtsType.ASHBY, atsIdentifier: "runwayml", careerPageUrl: "https://runwayml.com/careers" },
  { name: "Scale AI", atsType: AtsType.ASHBY, atsIdentifier: "scaleai", careerPageUrl: "https://scale.com/careers" },
  { name: "Weights & Biases", atsType: AtsType.ASHBY, atsIdentifier: "wandb", careerPageUrl: "https://wandb.ai/careers" },
  { name: "Railway", atsType: AtsType.ASHBY, atsIdentifier: "railway", careerPageUrl: "https://railway.app/careers" },
  { name: "Resend", atsType: AtsType.ASHBY, atsIdentifier: "resend", careerPageUrl: "https://resend.com/careers" },
  { name: "Clerk", atsType: AtsType.ASHBY, atsIdentifier: "clerk", careerPageUrl: "https://clerk.com/careers" },
  { name: "Neon", atsType: AtsType.ASHBY, atsIdentifier: "neon", careerPageUrl: "https://neon.tech/careers" },
  { name: "Inngest", atsType: AtsType.ASHBY, atsIdentifier: "inngest", careerPageUrl: "https://www.inngest.com/careers" },
  { name: "PostHog", atsType: AtsType.ASHBY, atsIdentifier: "posthog", careerPageUrl: "https://posthog.com/careers" },
  { name: "Vanta", atsType: AtsType.ASHBY, atsIdentifier: "vanta", careerPageUrl: "https://www.vanta.com/careers" },
  { name: "Loom", atsType: AtsType.ASHBY, atsIdentifier: "loom", careerPageUrl: "https://www.loom.com/careers" },
  { name: "Rippling", atsType: AtsType.ASHBY, atsIdentifier: "rippling", careerPageUrl: "https://www.rippling.com/careers" },

  // ─── SmartRecruiters (Global Enterprises & Infrastructure) ───
  { name: "Spotify", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "Spotify", careerPageUrl: "https://www.lifeatspotify.com/jobs" },
  { name: "Visa", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "Visa", careerPageUrl: "https://www.visa.com/careers" },
  { name: "Bosch", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "BoschGroup", careerPageUrl: "https://www.bosch.com/careers" },
  { name: "Avery Dennison", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "AveryDennison", careerPageUrl: "https://careers.averydennison.com" },
  { name: "Skechers", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "Skechers", careerPageUrl: "https://about.skechers.com/careers" },
  { name: "Equinix", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "Equinix", careerPageUrl: "https://careers.equinix.com" },
  { name: "Ubisoft", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "Ubisoft", careerPageUrl: "https://www.ubisoft.com/en-us/company/careers" },

  // ─── Workable (Scale-ups & International Pioneers) ───
  { name: "Basecamp", atsType: AtsType.WORKABLE, atsIdentifier: "basecamp", careerPageUrl: "https://basecamp.com/jobs" },
  { name: "InVision", atsType: AtsType.WORKABLE, atsIdentifier: "invision", careerPageUrl: "https://www.invisionapp.com/careers" },
  { name: "Typeform", atsType: AtsType.WORKABLE, atsIdentifier: "typeform", careerPageUrl: "https://www.typeform.com/careers" },
  { name: "BrowserStack", atsType: AtsType.WORKABLE, atsIdentifier: "browserstack", careerPageUrl: "https://www.browserstack.com/careers" },
  { name: "Wise", atsType: AtsType.WORKABLE, atsIdentifier: "wise", careerPageUrl: "https://www.wise.jobs" },
  { name: "Revolut", atsType: AtsType.WORKABLE, atsIdentifier: "revolut", careerPageUrl: "https://www.revolut.com/careers" },
  { name: "Monzo", atsType: AtsType.WORKABLE, atsIdentifier: "monzo", careerPageUrl: "https://monzo.com/careers" },
  { name: "Paddle", atsType: AtsType.WORKABLE, atsIdentifier: "paddle", careerPageUrl: "https://www.paddle.com/careers" },

  // ─── Workday (Enterprise & Cloud Titans) ───
  { name: "Salesforce", atsType: AtsType.WORKDAY, atsIdentifier: "salesforce:External", careerPageUrl: "https://salesforce.wd1.myworkdayjobs.com/External_Career_Site" },
  { name: "Adobe", atsType: AtsType.WORKDAY, atsIdentifier: "adobe:external", careerPageUrl: "https://adobe.wd5.myworkdayjobs.com/external_experienced" },
  { name: "Netflix", atsType: AtsType.WORKDAY, atsIdentifier: "netflix:external", careerPageUrl: "https://jobs.netflix.com" },
  { name: "Cisco", atsType: AtsType.WORKDAY, atsIdentifier: "cisco:external", careerPageUrl: "https://jobs.cisco.com" },
  { name: "Intuit", atsType: AtsType.WORKDAY, atsIdentifier: "intuit:external", careerPageUrl: "https://jobs.intuit.com" },
  { name: "Autodesk", atsType: AtsType.WORKDAY, atsIdentifier: "autodesk:external", careerPageUrl: "https://autodesk.wd1.myworkdayjobs.com/Ext" },
  { name: "Walmart Global Tech", atsType: AtsType.WORKDAY, atsIdentifier: "walmart:external", careerPageUrl: "https://careers.walmart.com/technology" },

  // ─── Firecrawl / Wellfound / Startups ───
  { name: "Wellfound Startups", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "wellfound.com/jobs", careerPageUrl: "https://wellfound.com/jobs" },
  { name: "Y Combinator Startups", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "workatastartup.com", careerPageUrl: "https://www.workatastartup.com" },
  { name: "Sequoia Talent Directory", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.sequoiacap.com", careerPageUrl: "https://jobs.sequoiacap.com" },
  { name: "a16z Portfolio Careers", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.a16z.com", careerPageUrl: "https://jobs.a16z.com" },
];

async function main() {
  console.log(`Seeding expanded registry with ${COMPANIES.length} premier tech employers...`);

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

  console.log(`Successfully seeded ${count} active companies across all ATS types!`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
