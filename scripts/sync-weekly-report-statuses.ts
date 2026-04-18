import { weeklyReportService } from "@/modules/weekly-reports/service";

async function main() {
  const result = await weeklyReportService.markOverdueReports();
  console.log(`[weekly-status-sync] updatedCount=${result.updatedCount}`);
}

main()
  .catch((error) => {
    console.error("[weekly-status-sync] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
