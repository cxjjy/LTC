import { redirect } from "next/navigation";

import { getNaturalWeekRange, formatWeekKey } from "@/lib/week";

export default function WeeklyReportsPage() {
  redirect(`/weekly-reports/${formatWeekKey(getNaturalWeekRange().weekStart)}`);
}
