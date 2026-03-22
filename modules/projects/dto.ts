import type { z } from "zod";

import type {
  projectCreateSchema,
  projectStatusSchema,
  projectUpdateSchema
} from "@/modules/projects/validation";

export type CreateProjectDto = z.infer<typeof projectCreateSchema>;
export type UpdateProjectDto = z.infer<typeof projectUpdateSchema>;
export type ChangeProjectStatusDto = z.infer<typeof projectStatusSchema>;
