import { weeklyReportService } from "@/modules/weekly-reports/service";

async function main() {
  const result = await weeklyReportService.precreateDraftsForActiveUsers();
  console.log(`[weekly-drafts] weekStart=${result.weekStart} createdUsers=${result.createdUsers}`);
}

main()
  .catch((error) => {
    console.error("[weekly-drafts] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
