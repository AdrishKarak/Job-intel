import { prisma } from "./src";

async function main() {
  console.log("Database seed placeholder ready for Phase 2 company seeding.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
