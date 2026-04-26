"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSection } from "@/components/form-section";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { PageContainer } from "@/components/page-container";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contractStatusLabels } from "@/lib/constants";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import { buildContractFields } from "@/modules/contracts/ui/config";
import { contractCreateSchema, contractUpdateSchema } from "@/modules/contracts/validation";
import type { SelectOption } from "@/types/common";

type ContractFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  projectOptions: SelectOption[];
  supplierOptions?: SelectOption[];
  contractId?: string;
  approvalId?: string;
};

export function ContractForm({
  mode,
  defaultValues,
  projectOptions,
  supplierOptions = [],
  contractId,
  approvalId
}: ContractFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fields = useMemo(() => buildContractFields(projectOptions, supplierOptions), [projectOptions, supplierOptions]);
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(mode === "create" ? contractCreateSchema : contractUpdateSchema),
    defaultValues: {
      projectId: "",
      supplierId: "",
      direction: "SALES",
      name: "",
      contractAmount: undefined,
      signedDate: "",
      effectiveDate: "",
      endDate: "",
      status: "ACTIVE",
      description: "",
      ...defaultValues
    }
  });
  const direction = String(form.watch("direction") ?? defaultValues.direction ?? "SALES");

  useEffect(() => {
    if (direction !== "PURCHASE" && form.getValues("supplierId")) {
      form.setValue("supplierId", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [direction, form]);

  const handleSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const submitUrl = mode === "create" ? buildCreateSubmitUrl(approvalId) : `/api/contracts/${contractId}`;
      const response = await fetch(submitUrl, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(stripReadonlyFields(values))
      });

      const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id?: string }>;

      if (!response.ok) {
        setError(getUserFriendlyError(payload, mode === "create" ? "创建合同失败，请稍后重试" : "保存修改失败，请稍后重试"));
        return;
      }

      const targetHref =
        mode === "create"
          ? (payload as ApiSuccessPayload<{ id?: string }>).data?.id
            ? `/contracts/${(payload as ApiSuccessPayload<{ id?: string }>).data?.id}`
            : "/contracts"
          : `/contracts/${contractId}`;
      router.push(targetHref);
      router.refresh();
    });
  });

  const midpoint = Math.ceil(fields.length / 2);
  const basicFields = fields.slice(0, midpoint);
  const businessFields = fields.slice(midpoint);
  const status = String(form.watch("status") ?? defaultValues.status ?? "ACTIVE");

  return (
    <PageContainer className="space-y-6">
      <SectionCard
        title={mode === "create" ? "新建合同" : "编辑合同"}
        description={mode === "create" ? "普通合同创建后直接生效。" : "可继续维护合同信息。"}
      >
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border bg-[var(--color-muted)]/40 px-4 py-3">
            <div className="text-sm text-muted-foreground">当前状态</div>
            <Badge variant={getStatusBadgeVariant(status)}>
              {contractStatusLabels[status as keyof typeof contractStatusLabels] ?? status}
            </Badge>
          </div>
          <FormSection title="基本信息">
            <div className="grid gap-4 md:grid-cols-2">
              {basicFields.map((field) => (
                <FieldRenderer key={field.name} field={field} form={form} direction={direction} />
              ))}
            </div>
          </FormSection>
          {businessFields.length ? (
            <FormSection title="业务信息">
              <div className="grid gap-4 md:grid-cols-2">
                {businessFields.map((field) => (
                  <FieldRenderer key={field.name} field={field} form={form} direction={direction} />
                ))}
              </div>
            </FormSection>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={isPending}>
              {mode === "create" ? (isPending ? "创建中..." : "创建合同") : isPending ? "保存中..." : "保存修改"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              返回
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}

function FieldRenderer({
  field,
  form,
  direction
}: {
  field: ReturnType<typeof buildContractFields>[number];
  form: ReturnType<typeof useForm<Record<string, unknown>>>;
  direction: string;
}) {
  const isSupplierField = field.name === "supplierId";
  const supplierDisabled = isSupplierField && direction !== "PURCHASE";
  const placeholder =
    isSupplierField && supplierDisabled ? "采购合同才需要选择供应商" : field.placeholder;

  return (
    <div className={field.type === "textarea" ? "md:col-span-2" : ""}>
      <Label htmlFor={field.name}>{field.label}</Label>
      <div className="mt-2">
        {field.type === "textarea" ? (
          <Textarea id={field.name} placeholder={placeholder} {...form.register(field.name)} />
        ) : field.type === "select" ? (
          <SearchableSelect
            value={String(form.watch(field.name) ?? "")}
            onValueChange={(value) => form.setValue(field.name, value, { shouldValidate: true })}
            options={field.options ?? []}
            requestUrl={supplierDisabled ? undefined : field.requestUrl}
            placeholder={supplierDisabled ? placeholder : `请选择${field.label}`}
            searchPlaceholder={`搜索${field.label}`}
            disabled={supplierDisabled}
          />
        ) : (
          <Input id={field.name} type={field.type} placeholder={placeholder} {...form.register(field.name)} />
        )}
      </div>
      {isSupplierField && supplierDisabled ? (
        <p className="mt-1.5 text-xs text-muted-foreground">当前为销售合同，供应商字段不参与编辑。</p>
      ) : null}
      {form.formState.errors[field.name] ? (
        <p className="mt-1.5 text-sm text-destructive">
          {String(form.formState.errors[field.name]?.message ?? "")}
        </p>
      ) : null}
    </div>
  );
}

function buildCreateSubmitUrl(approvalId: string | undefined) {
  const params = new URLSearchParams();
  if (approvalId) {
    params.set("approvalId", approvalId);
  }
  return `/api/contracts?${params.toString()}`;
}

function stripReadonlyFields(values: Record<string, unknown>) {
  const next = { ...values };
  delete next.status;
  return next;
}

function getStatusBadgeVariant(status: string): "muted" | "warning" | "success" | "danger" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "TERMINATED") return "default";
  return "muted";
}
