import { z } from "zod";

export const userCreateSchema = z.object({
  username: z.string().min(2, "请输入用户名"),
  displayName: z.string().min(2, "请输入展示名称"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6, "初始密码至少 6 位"),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string()).min(1, "请至少分配一个角色")
});

export const userUpdateSchema = z.object({
  username: z.string().min(2, "请输入用户名"),
  displayName: z.string().min(2, "请输入展示名称"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string()).min(1, "请至少分配一个角色")
});

export const userStatusSchema = z.object({
  isActive: z.boolean()
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "重置密码至少 6 位")
});

export type CreateUserInput = z.infer<typeof userCreateSchema>;
export type UpdateUserInput = z.infer<typeof userUpdateSchema>;
