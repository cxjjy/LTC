import type { z } from "zod";

import type {
  convertLeadSchema,
  leadCreateSchema,
  leadUpdateSchema
} from "@/modules/leads/validation";

export type CreateLeadDto = z.infer<typeof leadCreateSchema>;
export type UpdateLeadDto = z.infer<typeof leadUpdateSchema>;
export type ConvertLeadDto = z.infer<typeof convertLeadSchema>;
