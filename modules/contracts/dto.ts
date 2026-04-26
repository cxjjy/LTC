import type { z } from "zod";

import type { contractCreateSchema, contractUpdateSchema } from "@/modules/contracts/validation";

export type CreateContractDto = z.infer<typeof contractCreateSchema>;
export type UpdateContractDto = z.infer<typeof contractUpdateSchema>;
