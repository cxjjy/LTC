import type { z } from "zod";

import type {
  paymentRecordCreateSchema,
  paymentRecordUpdateSchema
} from "@/modules/payment-records/validation";

export type CreatePaymentRecordDto = z.infer<typeof paymentRecordCreateSchema>;
export type UpdatePaymentRecordDto = z.infer<typeof paymentRecordUpdateSchema>;
