import type { z } from "zod";

import type {
  contractCreateSchema,
  contractStatusSchema,
  contractUpdateSchema
} from "@/modules/contracts/validation";

export type CreateContractDto = z.infer<typeof contractCreateSchema>;
export type UpdateContractDto = z.infer<typeof contractUpdateSchema>;
export type ChangeContractStatusDto = z.infer<typeof contractStatusSchema>;
