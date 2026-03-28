import { z } from "zod";

export const roleCreateSchema = z.object({
  code: z
    .string()
    .min(2, "请输入角色编码")
    .regex(/^[A-Z0-9_]+$/, "角色编码仅支持大写字母、数字和下划线"),
  name: z.string().min(2, "请输入角色名称"),
  description: z.string().optional(),
  permissionCodes: z.array(z.string()).min(1, "请至少选择一个权限")
});

export const roleUpdateSchema = roleCreateSchema.extend({
  isSystem: z.boolean().optional()
});

export type CreateRoleInput = z.infer<typeof roleCreateSchema>;
export type UpdateRoleInput = z.infer<typeof roleUpdateSchema>;
