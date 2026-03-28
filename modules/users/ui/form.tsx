"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSection } from "@/components/form-section";
import { PageContainer } from "@/components/page-container";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";
import type { CreateUserInput, UpdateUserInput } from "@/modules/users/validation";
import { userCreateSchema, userUpdateSchema } from "@/modules/users/validation";

type RoleOption = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
};

type UserFormProps = {
  mode: "create" | "edit";
  userId?: string;
  roles: RoleOption[];
  defaultValues?: Partial<CreateUserInput & UpdateUserInput>;
};

type UserFormValues = {
  username: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  isActive: boolean;
  roleIds: string[];
};

export function UserForm({ mode, userId, roles, defaultValues }: UserFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const schema = mode === "create" ? userCreateSchema : userUpdateSchema;
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
      isActive: true,
      roleIds: [],
      ...(mode === "create" ? { password: "" } : {}),
      ...defaultValues
    }
  });

  const selectedRoleIds = form.watch("roleIds") ?? [];

  function toggleRole(roleId: string) {
    const next = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((item) => item !== roleId)
      : [...selectedRoleIds, roleId];
    form.setValue("roleIds", next, { shouldValidate: true });
  }

  const onSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const response = await fetch(mode === "create" ? "/api/system/users" : `/api/system/users/${userId}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok) {
        setError(getUserFriendlyError(payload, "保存失败，请稍后重试"));
        return;
      }

      router.push("/system/users");
      router.refresh();
    });
  });

  return (
    <PageContainer className="space-y-6">
      <SectionCard title={mode === "create" ? "新增用户" : "编辑用户"} description="维护系统用户信息、状态和角色分配。">
        <form onSubmit={onSubmit} className="grid gap-6">
          <FormSection title="基本信息">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="用户名" error={form.formState.errors.username?.message}>
                <Input {...form.register("username")} placeholder="输入用户名" />
              </Field>
              <Field label="姓名" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="输入姓名" />
              </Field>
              <Field label="邮箱" error={form.formState.errors.email?.message}>
                <Input {...form.register("email")} placeholder="输入邮箱" />
              </Field>
              <Field label="手机号" error={form.formState.errors.phone?.message}>
                <Input {...form.register("phone")} placeholder="输入手机号" />
              </Field>
              {mode === "create" ? (
                <Field label="初始密码" error={form.formState.errors.password?.message}>
                  <Input type="password" {...form.register("password")} placeholder="至少 6 位" />
                </Field>
              ) : null}
              <Field label="账号状态">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-primary)]"
                    checked={Boolean(form.watch("isActive"))}
                    onChange={(event) => form.setValue("isActive", event.target.checked)}
                  />
                  启用账号
                </label>
              </Field>
            </div>
          </FormSection>

          <FormSection title="角色分配">
            <div className="grid gap-3 md:grid-cols-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start gap-3 rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">{role.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {role.code}
                      {role.isSystem ? " · 系统角色" : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {form.formState.errors.roleIds?.message ? (
              <p className="mt-2 text-sm text-destructive">{String(form.formState.errors.roleIds.message)}</p>
            ) : null}
          </FormSection>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : mode === "create" ? "创建用户" : "保存修改"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/system/users")}>
              返回列表
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}

function Field({
  label,
  children,
  error
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
