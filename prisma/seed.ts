import { PrismaClient } from "@prisma/client";
import { CATEGORIES } from "./categories";
import { SERVICE_CATEGORIES } from "./service-categories";

/**
 * Phase 1 seed: product categories ONLY. Idempotent (safe to run repeatedly).
 * It never creates users, suppliers, customers, passwords or admin accounts.
 * Admin creation is a controlled manual step (see docs/SETUP_SUPABASE.md).
 */
const prisma = new PrismaClient();

async function main() {
  for (const name of CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  for (const name of SERVICE_CATEGORIES) await prisma.serviceCategory.upsert({ where: { name }, update: {}, create: { name } });
  const count = await prisma.productCategory.count();
  const serviceCount = await prisma.serviceCategory.count();
  console.log(`Seeded categories. product_categories rows: ${count}; service_categories rows: ${serviceCount}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
