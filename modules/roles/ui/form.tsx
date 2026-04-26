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
import { groupPermissionDefinitions } from "@/lib/permissions";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";
import { roleCreateSchema, roleUpdateSchema, type CreateRoleInput, type UpdateRoleInput } from "@/modules/roles/validation";

type RoleFormProps = {
  mode: "create" | "edit";
  roleId?: string;
  defaultValues?: Partial<CreateRoleInput & UpdateRoleInput>;
};

export function RoleForm({ mode, roleId, defaultValues }: RoleFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const groups = groupPermissionDefinitions();
  const form = useForm<CreateRoleInput | UpdateRoleInput>({
    resolver: zodResolver(mode === "create" ? roleCreateSchema : roleUpdateSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      permissionCodes: [],
      ...defaultValues
    }
  });
  const selectedCodes = form.watch("permissionCodes") ?? [];

  function togglePermission(code: string) {
    const next = selectedCodes.includes(code)
      ? selectedCodes.filter((item) => item !== code)
      : [...selectedCodes, code];
    form.setValue("permissionCodes", next, { shouldValidate: true });
  }

  const onSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const response = await fetch(mode === "create" ? "/api/system/roles" : `/api/system/roles/${roleId}`, {
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
      router.push("/system/roles");
    });
  });

  return (
    <PageContainer className="space-y-6">
      <SectionCard title={mode === "create" ? "新增角色" : "编辑角色"} description="维护角色基本信息并分配功能权限。">
        <form onSubmit={onSubmit} className="grid gap-6">
          <FormSection title="基本信息">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="角色编码" error={form.formState.errors.code?.message}>
                <Input {...form.register("code")} placeholder="例如 PROJECT_MANAGER" />
              </Field>
              <Field label="角色名称" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="输入角色名称" />
              </Field>
              <Field label="角色描述" error={form.formState.errors.description?.message}>
                <Input {...form.register("description")} placeholder="输入角色描述" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="权限分配">
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.module} className="rounded-[14px] border border-border bg-[var(--color-background)] p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">{group.label}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.permissions.map((permission) => (
                      <label key={permission.code} className="flex items-start gap-3 rounded-[10px] bg-white px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                          checked={selectedCodes.includes(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                        />
                        <div>
                          <div className="text-sm font-medium text-foreground">{permission.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{permission.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {form.formState.errors.permissionCodes?.message ? (
              <p className="mt-2 text-sm text-destructive">{String(form.formState.errors.permissionCodes.message)}</p>
            ) : null}
          </FormSection>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : mode === "create" ? "创建角色" : "保存修改"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/system/roles")}>
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
