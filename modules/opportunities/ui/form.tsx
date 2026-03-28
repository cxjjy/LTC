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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import { formatCurrency } from "@/lib/utils";
import { opportunityStageOptions } from "@/modules/opportunities/ui/config";
import { calculateOpportunityEstimate } from "@/modules/opportunities/profit";
import {
  opportunityCreateSchema,
  opportunityUpdateSchema
} from "@/modules/opportunities/validation";
import type { SelectOption } from "@/types/common";

type OpportunityFormValues = {
  customerId: string;
  name: string;
  estimatedRevenue: number | string;
  estimatedLaborCost: number | string;
  estimatedOutsourceCost: number | string;
  estimatedProcurementCost: number | string;
  estimatedTravelCost: number | string;
  estimatedOtherCost: number | string;
  expectedSignDate?: string;
  winRate?: number | string;
  stage: string;
  description?: string;
};

type OpportunityFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  customerOptions: SelectOption[];
  opportunityId?: string;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function OpportunityForm({
  mode,
  defaultValues,
  customerOptions,
  opportunityId
}: OpportunityFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver((mode === "create" ? opportunityCreateSchema : opportunityUpdateSchema) as any),
    defaultValues: {
      customerId: "",
      name: "",
      estimatedRevenue: 0,
      estimatedLaborCost: 0,
      estimatedOutsourceCost: 0,
      estimatedProcurementCost: 0,
      estimatedTravelCost: 0,
      estimatedOtherCost: 0,
      expectedSignDate: "",
      winRate: undefined,
      stage: "DISCOVERY",
      description: "",
      ...defaultValues
    } as OpportunityFormValues
  });

  const estimate = calculateOpportunityEstimate({
    estimatedRevenue: form.watch("estimatedRevenue"),
    estimatedLaborCost: form.watch("estimatedLaborCost"),
    estimatedOutsourceCost: form.watch("estimatedOutsourceCost"),
    estimatedProcurementCost: form.watch("estimatedProcurementCost"),
    estimatedTravelCost: form.watch("estimatedTravelCost"),
    estimatedOtherCost: form.watch("estimatedOtherCost")
  });

  const onSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const response = await fetch(mode === "create" ? "/api/opportunities" : `/api/opportunities/${opportunityId}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id?: string }>;

      if (!response.ok) {
        setError(getUserFriendlyError(payload, "保存失败，请稍后重试"));
        return;
      }

      router.push(
        mode === "create"
          ? `/opportunities/${(payload as ApiSuccessPayload<{ id?: string }>).data?.id}`
          : `/opportunities/${opportunityId}`
      );
      router.refresh();
    });
  });

  return (
    <PageContainer className="space-y-6">
      <SectionCard title={mode === "create" ? "新建商机" : "编辑商机"} description="维护商机基本信息，并在售前阶段完成商业测算。">
        <form onSubmit={onSubmit} className="grid gap-6">
          <FormSection title="基本信息">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="客户" error={String(form.formState.errors.customerId?.message ?? "")}>
                <Select
                  value={String(form.watch("customerId") ?? "")}
                  onValueChange={(value) => form.setValue("customerId", value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择客户" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="商机名称" error={String(form.formState.errors.name?.message ?? "")}>
                <Input {...form.register("name")} placeholder="输入商机名称" />
              </Field>
              <Field label="预计签约日期" error={String(form.formState.errors.expectedSignDate?.message ?? "")}>
                <Input type="date" {...form.register("expectedSignDate")} />
              </Field>
              <Field label="赢率" error={String(form.formState.errors.winRate?.message ?? "")}>
                <Input type="number" {...form.register("winRate")} placeholder="例如 75" />
              </Field>
              <Field label="阶段" error={String(form.formState.errors.stage?.message ?? "")}>
                <Select
                  value={String(form.watch("stage") ?? "DISCOVERY")}
                  onValueChange={(value) => form.setValue("stage", value as OpportunityFormValues["stage"], { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择阶段" />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunityStageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="描述" className="md:col-span-2" error={String(form.formState.errors.description?.message ?? "")}>
                <Textarea {...form.register("description")} placeholder="输入商机背景和关键说明" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="商业测算 / 毛利预估">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="预估收入" error={String(form.formState.errors.estimatedRevenue?.message ?? "")}>
                  <Input type="number" {...form.register("estimatedRevenue")} placeholder="输入预估收入" />
                </Field>
                <Field label="人工成本" error={String(form.formState.errors.estimatedLaborCost?.message ?? "")}>
                  <Input type="number" {...form.register("estimatedLaborCost")} placeholder="输入人工成本" />
                </Field>
                <Field label="外包成本" error={String(form.formState.errors.estimatedOutsourceCost?.message ?? "")}>
                  <Input type="number" {...form.register("estimatedOutsourceCost")} placeholder="输入外包成本" />
                </Field>
                <Field label="采购成本" error={String(form.formState.errors.estimatedProcurementCost?.message ?? "")}>
                  <Input type="number" {...form.register("estimatedProcurementCost")} placeholder="输入采购成本" />
                </Field>
                <Field label="差旅成本" error={String(form.formState.errors.estimatedTravelCost?.message ?? "")}>
                  <Input type="number" {...form.register("estimatedTravelCost")} placeholder="输入差旅成本" />
                </Field>
                <Field label="其他成本" error={String(form.formState.errors.estimatedOtherCost?.message ?? "")}>
                  <Input type="number" {...form.register("estimatedOtherCost")} placeholder="输入其他成本" />
                </Field>
              </div>

              <div className="rounded-[16px] border border-border bg-[var(--color-background)] p-5">
                <div className="text-sm font-medium text-foreground">测算结果</div>
                <div className="mt-4 space-y-4">
                  <Metric label="成本合计" value={formatCurrency(estimate.estimatedTotalCost)} />
                  <Metric label="预估毛利" value={formatCurrency(estimate.estimatedProfit)} />
                  <Metric label="毛利率" value={formatPercent(estimate.estimatedProfitMargin)} />
                </div>
                <div
                  className={`mt-5 rounded-[12px] px-4 py-3 text-sm ${
                    estimate.riskLevel === "high_risk"
                      ? "bg-[rgba(239,68,68,0.08)] text-[rgb(185,28,28)]"
                      : estimate.riskLevel === "low_margin"
                        ? "bg-[rgba(245,158,11,0.10)] text-[rgb(180,83,9)]"
                        : "bg-[rgba(16,185,129,0.10)] text-[rgb(4,120,87)]"
                  }`}
                >
                  <div className="font-medium">{estimate.riskLabel}</div>
                  <div className="mt-1 text-xs opacity-90">
                    {estimate.riskLevel === "high_risk"
                      ? "当前毛利率低于 10%，建议重新审视报价与成本结构。"
                      : estimate.riskLevel === "low_margin"
                        ? "当前毛利率低于 20%，建议重点关注利润空间。"
                        : "当前测算处于可接受区间，可继续推进售前评估。"}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : mode === "create" ? "创建商机" : "保存修改"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/opportunities")}>
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
  error,
  className
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-foreground">{value}</div>
    </div>
  );
}
