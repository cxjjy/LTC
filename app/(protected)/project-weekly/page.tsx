import { redirect } from "next/navigation";

import { formatWeekKey, getNaturalWeekRange } from "@/lib/week";

export default function ProjectWeeklyPage() {
  redirect(`/project-weekly/${formatWeekKey(getNaturalWeekRange().weekStart)}`);
}
