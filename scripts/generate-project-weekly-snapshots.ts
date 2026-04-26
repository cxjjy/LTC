import { formatWeekKey, getNaturalWeekRange } from "@/lib/week";
import { projectWeeklyService } from "@/modules/project-weekly/service";

async function main() {
  const defaultWeek = formatWeekKey(getNaturalWeekRange().weekStart);
  const week = process.argv[2] ?? defaultWeek;
  const result = await projectWeeklyService.generateProjectWeeklySnapshots(week);
  console.log(`[project-weekly] weekStart=${result.weekStart} generatedCount=${result.generatedCount}`);
}

main()
  .catch((error) => {
    console.error("[project-weekly] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
  });
