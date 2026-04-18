import type { z } from "zod";

import type {
  invoiceAttachmentMetaSchema,
  invoiceRecordCreateSchema,
  invoiceRecordUpdateSchema
} from "@/modules/invoice-records/validation";

export type CreateInvoiceRecordDto = z.infer<typeof invoiceRecordCreateSchema>;
export type UpdateInvoiceRecordDto = z.infer<typeof invoiceRecordUpdateSchema>;
export type UpdateInvoiceAttachmentMetaDto = z.infer<typeof invoiceAttachmentMetaSchema>;
