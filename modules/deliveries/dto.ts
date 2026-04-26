import type { z } from "zod";

import type {
  deliveryCreateSchema,
  deliveryUpdateSchema
} from "@/modules/deliveries/validation";

export type CreateDeliveryDto = z.infer<typeof deliveryCreateSchema>;
export type UpdateDeliveryDto = z.infer<typeof deliveryUpdateSchema>;
