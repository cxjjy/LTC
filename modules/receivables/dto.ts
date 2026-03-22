import type { z } from "zod";

import type {
  receivableCreateSchema,
  receivablePaymentSchema,
  receivableUpdateSchema
} from "@/modules/receivables/validation";

export type CreateReceivableDto = z.infer<typeof receivableCreateSchema>;
export type UpdateReceivableDto = z.infer<typeof receivableUpdateSchema>;
export type UpdateReceivablePaymentDto = z.infer<typeof receivablePaymentSchema>;
