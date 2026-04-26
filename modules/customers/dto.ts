import type { z } from "zod";

import type { customerCreateSchema, customerUpdateSchema } from "@/modules/customers/validation";

export type CreateCustomerDto = z.infer<typeof customerCreateSchema>;
export type UpdateCustomerDto = z.infer<typeof customerUpdateSchema>;
