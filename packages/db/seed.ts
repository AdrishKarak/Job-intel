import { prisma, AtsType } from "./src";

export const COMPANIES: Array<{
  name: string;
  atsType: AtsType;
  atsIdentifier: string;
  careerPageUrl: string;
}> = [
  // 1-25: IT Services, Consultancies & Systems Integrators
  { name: "Capgemini", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.capgemini.com", careerPageUrl: "https://jobs.capgemini.com/in-en/" },
  { name: "Deloitte", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "southasiacareers.deloitte.com", careerPageUrl: "https://southasiacareers.deloitte.com/" },
  { name: "EY", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ey.com/careers", careerPageUrl: "https://www.ey.com/en_in/careers" },
  { name: "PwC", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "pwc.in/careers", careerPageUrl: "https://www.pwc.in/careers.html" },
  { name: "KPMG", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "kpmg.com/careers", careerPageUrl: "https://kpmg.com/in/en/careers.html" },
  { name: "Accenture", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "accenture.com/careers", careerPageUrl: "https://www.accenture.com/in-en/careers" },
  { name: "Cognizant", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.cognizant.com", careerPageUrl: "https://careers.cognizant.com/global/en" },
  { name: "LTIMindtree", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ltimindtree.com/careers", careerPageUrl: "https://www.ltimindtree.com/careers/" },
  { name: "HCLTech", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "hcltech.com/careers", careerPageUrl: "https://www.hcltech.com/careers" },
  { name: "Wipro", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.wipro.com", careerPageUrl: "https://careers.wipro.com/" },
  { name: "TCS", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "tcs.com/careers", careerPageUrl: "https://www.tcs.com/careers" },
  { name: "Infosys", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "infosys.com/careers", careerPageUrl: "https://www.infosys.com/careers/" },
  { name: "Tech Mahindra", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.techmahindra.com", careerPageUrl: "https://careers.techmahindra.com/" },
  { name: "Mphasis", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.mphasis.com", careerPageUrl: "https://careers.mphasis.com/" },
  { name: "Hexaware", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.hexaware.com", careerPageUrl: "https://jobs.hexaware.com/" },
  { name: "Coforge", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "coforge.com/careers", careerPageUrl: "https://www.coforge.com/careers" },
  { name: "Persistent Systems", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "persistent.com/careers", careerPageUrl: "https://www.persistent.com/careers/" },
  { name: "Zensar Technologies", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "zensar.com/careers", careerPageUrl: "https://www.zensar.com/careers/" },
  { name: "Birlasoft", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "birlasoft.com/careers", careerPageUrl: "https://www.birlasoft.com/company/careers" },
  { name: "NTT DATA", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "nttdata.com/careers", careerPageUrl: "https://www.nttdata.com/global/en/careers" },
  { name: "CGI", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "cgi.com/careers", careerPageUrl: "https://www.cgi.com/en/careers" },
  { name: "DXC Technology", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.dxc.com", careerPageUrl: "https://careers.dxc.com/global/en" },
  { name: "GlobalLogic", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "globallogic.com/careers", careerPageUrl: "https://www.globallogic.com/careers/" },
  { name: "EPAM Systems", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "epam.com/careers", careerPageUrl: "https://www.epam.com/careers" },
  { name: "Publicis Sapient", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.publicissapient.com", careerPageUrl: "https://careers.publicissapient.com/" },

  // 26-50: Enterprise Tech, Semiconductor, Industrial & Engineering Tech
  { name: "Amazon", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "amazon.jobs", careerPageUrl: "https://www.amazon.jobs/" },
  { name: "IBM", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ibm.com/careers", careerPageUrl: "https://www.ibm.com/careers" },
  { name: "Oracle", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.oracle.com", careerPageUrl: "https://careers.oracle.com/" },
  { name: "SAP", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.sap.com", careerPageUrl: "https://jobs.sap.com/" },
  { name: "Cisco", atsType: AtsType.WORKDAY, atsIdentifier: "cisco:external", careerPageUrl: "https://jobs.cisco.com/" },
  { name: "HPE", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.hpe.com", careerPageUrl: "https://careers.hpe.com/" },
  { name: "Dell Technologies", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.dell.com", careerPageUrl: "https://jobs.dell.com/" },
  { name: "Honeywell", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.honeywell.com", careerPageUrl: "https://careers.honeywell.com/" },
  { name: "Siemens", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.siemens.com", careerPageUrl: "https://jobs.siemens.com/" },
  { name: "Bosch", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "BoschGroup", careerPageUrl: "https://www.bosch.com/careers/" },
  { name: "Schneider Electric", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "se.com/careers", careerPageUrl: "https://www.se.com/ww/en/about-us/careers/overview.jsp" },
  { name: "Emerson", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "emerson.com/careers", careerPageUrl: "https://www.emerson.com/en-us/careers" },
  { name: "GE HealthCare", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.gehealthcare.com", careerPageUrl: "https://careers.gehealthcare.com/" },
  { name: "Philips", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.philips.com", careerPageUrl: "https://www.careers.philips.com/" },
  { name: "Nokia", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.nokia.com", careerPageUrl: "https://careers.nokia.com/" },
  { name: "Ericsson", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.ericsson.com", careerPageUrl: "https://jobs.ericsson.com/" },
  { name: "Qualcomm", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.qualcomm.com", careerPageUrl: "https://careers.qualcomm.com/" },
  { name: "Intel", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.intel.com", careerPageUrl: "https://jobs.intel.com/" },
  { name: "AMD", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.amd.com", careerPageUrl: "https://careers.amd.com/" },
  { name: "Samsung R&D", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "samsungcareers.com", careerPageUrl: "https://www.samsungcareers.com/" },
  { name: "Sony", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "sony.com/careers", careerPageUrl: "https://www.sony.com/en/SonyInfo/Careers/" },
  { name: "NXP Semiconductors", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "nxp.com/careers", careerPageUrl: "https://www.nxp.com/company/about-nxp/careers:CAREERS" },
  { name: "Applied Materials", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.appliedmaterials.com", careerPageUrl: "https://careers.appliedmaterials.com/" },
  { name: "Micron Technology", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.micron.com", careerPageUrl: "https://careers.micron.com/" },
  { name: "Red Hat", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "redhat.com/jobs", careerPageUrl: "https://www.redhat.com/en/jobs" },

  // 51-73: SaaS, Product, Consumer Tech & Platforms
  { name: "Optum", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.unitedhealthgroup.com", careerPageUrl: "https://careers.unitedhealthgroup.com/" },
  { name: "BrowserStack", atsType: AtsType.WORKABLE, atsIdentifier: "browserstack", careerPageUrl: "https://www.browserstack.com/careers" },
  { name: "Freshworks", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.freshworks.com", careerPageUrl: "https://careers.freshworks.com/" },
  { name: "Zoho", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "zoho.com/careers", careerPageUrl: "https://www.zoho.com/careers/" },
  { name: "Postman", atsType: AtsType.LEVER, atsIdentifier: "postman", careerPageUrl: "https://www.postman.com/company/careers/" },
  { name: "Chargebee", atsType: AtsType.LEVER, atsIdentifier: "chargebee", careerPageUrl: "https://www.chargebee.com/careers/" },
  { name: "Whatfix", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "whatfix.com/careers", careerPageUrl: "https://whatfix.com/company/careers/" },
  { name: "Druva", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "druva.com/careers", careerPageUrl: "https://www.druva.com/about/careers" },
  { name: "Icertis", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "icertis.com/careers", careerPageUrl: "https://www.icertis.com/company/careers/" },
  { name: "HighRadius", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.highradius.com", careerPageUrl: "https://careers.highradius.com/" },
  { name: "Darwinbox", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "darwinbox.com/careers", careerPageUrl: "https://darwinbox.com/careers" },
  { name: "LeadSquared", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "leadsquared.com/careers", careerPageUrl: "https://www.leadsquared.com/careers/" },
  { name: "CleverTap", atsType: AtsType.LEVER, atsIdentifier: "clevertap", careerPageUrl: "https://clevertap.com/careers/" },
  { name: "WebEngage", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "webengage.com/careers", careerPageUrl: "https://webengage.com/careers/" },
  { name: "Wingify", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "wingify.com/careers", careerPageUrl: "https://wingify.com/careers/" },
  { name: "Amagi", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "amagi.com/careers", careerPageUrl: "https://www.amagi.com/careers" },
  { name: "Innovaccer", atsType: AtsType.LEVER, atsIdentifier: "innovaccer", careerPageUrl: "https://innovaccer.com/careers" },
  { name: "InMobi", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "inmobi.com/careers", careerPageUrl: "https://www.inmobi.com/company/careers" },
  { name: "Info Edge", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "infoedge.in/careers", careerPageUrl: "https://www.infoedge.in/careers" },
  { name: "MakeMyTrip", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.makemytrip.com", careerPageUrl: "https://careers.makemytrip.com/" },
  { name: "Jio Platforms", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.jio.com", careerPageUrl: "https://careers.jio.com/" },
  { name: "PhonePe", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "phonepe.com/careers", careerPageUrl: "https://www.phonepe.com/careers/" },
  { name: "Razorpay", atsType: AtsType.LEVER, atsIdentifier: "razorpay", careerPageUrl: "https://razorpay.com/jobs/" },

  // 74-100: Fintech, Global Banking & Financial Services, Specialized Tech
  { name: "Fiserv", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.fiserv.com", careerPageUrl: "https://careers.fiserv.com/" },
  { name: "PayPal", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "paypal.com/jobs", careerPageUrl: "https://www.paypal.com/us/webapps/mpp/jobs" },
  { name: "PayU", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.payu.com", careerPageUrl: "https://careers.payu.com/" },
  { name: "Mastercard", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.mastercard.com", careerPageUrl: "https://careers.mastercard.com/" },
  { name: "Visa", atsType: AtsType.SMARTRECRUITERS, atsIdentifier: "Visa", careerPageUrl: "https://jobs.visa.com/" },
  { name: "American Express", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.americanexpress.com", careerPageUrl: "https://careers.americanexpress.com/" },
  { name: "JPMorgan Chase", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.jpmorgan.com", careerPageUrl: "https://careers.jpmorgan.com/" },
  { name: "Wells Fargo", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "wellsfargojobs.com", careerPageUrl: "https://www.wellsfargojobs.com/" },
  { name: "HSBC", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "hsbc.com/careers", careerPageUrl: "https://www.hsbc.com/careers" },
  { name: "Barclays", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "search.jobs.barclays", careerPageUrl: "https://search.jobs.barclays/" },
  { name: "Deutsche Bank", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.db.com", careerPageUrl: "https://careers.db.com/" },
  { name: "UBS", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ubs.com/careers", careerPageUrl: "https://www.ubs.com/global/en/careers.html" },
  { name: "Standard Chartered", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "sc.com/careers", careerPageUrl: "https://www.sc.com/en/global-careers/" },
  { name: "Citi", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.citi.com", careerPageUrl: "https://jobs.citi.com/" },
  { name: "Fidelity Investments", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.fidelity.com", careerPageUrl: "https://jobs.fidelity.com/" },
  { name: "Broadridge", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.broadridge.com", careerPageUrl: "https://careers.broadridge.com/" },
  { name: "S&P Global", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.spglobal.com", careerPageUrl: "https://careers.spglobal.com/" },
  { name: "Moody's", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.moodys.com", careerPageUrl: "https://careers.moodys.com/" },
  { name: "BlackRock", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.blackrock.com", careerPageUrl: "https://careers.blackrock.com/" },
  { name: "Nucleus Software", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "nucleussoftware.com/careers", careerPageUrl: "https://www.nucleussoftware.com/careers/" },
  { name: "Newgen Software", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "newgensoft.com/careers", careerPageUrl: "https://newgensoft.com/careers/" },
  { name: "Financial Software and Systems (FSS)", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "fsstech.com/careers", careerPageUrl: "https://www.fsstech.com/careers/" },
  { name: "Sonata Software", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "sonata-software.com/careers", careerPageUrl: "https://www.sonata-software.com/careers" },
  { name: "KPIT Technologies", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "kpit.com/careers", careerPageUrl: "https://www.kpit.com/careers/" },
  { name: "Quest Global", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "quest-global.com/careers", careerPageUrl: "https://www.quest-global.com/careers/" },
  { name: "L&T Technology Services", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ltts.com/careers", careerPageUrl: "https://www.ltts.com/careers" },
  { name: "UST", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ust.com/careers", careerPageUrl: "https://www.ust.com/careers" },

  // 101-121: Healthcare, Pharma, Industrials, Logistics & E-Commerce
  { name: "Pfizer", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "pfizer.co.in/careers", careerPageUrl: "https://www.pfizer.co.in/careers" },
  { name: "Novartis", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "novartis.com/careers", careerPageUrl: "https://www.novartis.com/careers" },
  { name: "Sanofi", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.sanofi.com", careerPageUrl: "https://careers.sanofi.com/" },
  { name: "GSK", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "gsk.com/careers", careerPageUrl: "https://www.gsk.com/en-gb/careers/" },
  { name: "AstraZeneca", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.astrazeneca.com", careerPageUrl: "https://careers.astrazeneca.com/" },
  { name: "Johnson & Johnson", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.jnj.com", careerPageUrl: "https://careers.jnj.com/" },
  { name: "Abbott", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "jobs.abbott", careerPageUrl: "https://www.jobs.abbott/" },
  { name: "Roche", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.roche.com", careerPageUrl: "https://careers.roche.com/" },
  { name: "ABB", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "global.abb/careers", careerPageUrl: "https://global.abb/group/en/careers" },
  { name: "General Electric (GE)", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "ge.com/careers", careerPageUrl: "https://www.ge.com/careers" },
  { name: "3M", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "3m.com/careers", careerPageUrl: "https://www.3m.com/3M/en_US/careers-us/" },
  { name: "ACG (Associated Capsules Group)", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "acg-world.com/careers", careerPageUrl: "https://www.acg-world.com/careers" },
  { name: "Cummins", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.cummins.com", careerPageUrl: "https://careers.cummins.com/" },
  { name: "Caterpillar", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.caterpillar.com", careerPageUrl: "https://careers.caterpillar.com/" },
  { name: "Amdocs", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "amdocs.com/careers", careerPageUrl: "https://www.amdocs.com/careers" },
  { name: "Fujitsu", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "fujitsu.com/careers", careerPageUrl: "https://www.fujitsu.com/global/about/careers/" },
  { name: "DHL", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.dhl.com", careerPageUrl: "https://careers.dhl.com/" },
  { name: "FedEx", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "careers.fedex.com", careerPageUrl: "https://careers.fedex.com/" },
  { name: "Maersk", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "maersk.com/careers", careerPageUrl: "https://www.maersk.com/careers" },
  { name: "Adani Group", atsType: AtsType.CUSTOM_FIRECRAWL, atsIdentifier: "adani.com/careers", careerPageUrl: "https://www.adani.com/careers" },
  { name: "Poshmark", atsType: AtsType.GREENHOUSE, atsIdentifier: "poshmark", careerPageUrl: "https://careers.poshmark.com/" },
];

async function main() {
  console.log("1. Cleaning up previous employer companies, jobs, and histories...");
  await prisma.applicationStatusHistory.deleteMany({});
  await prisma.jobSkill.deleteMany({});
  await prisma.job.deleteMany({});
  const deleted = await prisma.company.deleteMany({});
  console.log(`Deleted ${deleted.count} old employer companies and associated jobs.`);

  console.log(`2. Seeding company registry with ${COMPANIES.length} specified employer companies...`);
  let count = 0;
  for (const comp of COMPANIES) {
    await prisma.company.create({
      data: {
        name: comp.name,
        atsType: comp.atsType,
        atsIdentifier: comp.atsIdentifier,
        careerPageUrl: comp.careerPageUrl,
        active: true,
      },
    });
    count++;
  }

  console.log(`Successfully seeded all ${count} employer companies!`);
  const total = await prisma.company.count();
  console.log(`Total companies in DB now: ${total}`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
