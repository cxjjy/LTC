import type { z } from "zod";

import type { costCreateSchema, costUpdateSchema } from "@/modules/costs/validation";

export type CreateCostDto = z.infer<typeof costCreateSchema>;
export type UpdateCostDto = z.infer<typeof costUpdateSchema>;
