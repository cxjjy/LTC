import type { z } from "zod";

import type {
  convertOpportunitySchema,
  opportunityCreateSchema,
  opportunityUpdateSchema
} from "@/modules/opportunities/validation";

export type CreateOpportunityDto = z.infer<typeof opportunityCreateSchema>;
export type UpdateOpportunityDto = z.infer<typeof opportunityUpdateSchema>;
export type ConvertOpportunityDto = z.infer<typeof convertOpportunitySchema>;
