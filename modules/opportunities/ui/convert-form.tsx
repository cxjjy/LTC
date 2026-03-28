"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/form-section";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";

export function OpportunityConvertForm({
  opportunityId,
  defaultName
}: {
  opportunityId: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <SectionCard title="商机转项目" description="项目将继承商机所属客户并进入项目链路。">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const response = await fetch(`/api/opportunities/${opportunityId}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: formData.get("name"),
                  budgetAmount: formData.get("budgetAmount"),
                  plannedStartDate: formData.get("plannedStartDate"),
                  plannedEndDate: formData.get("plannedEndDate"),
                  description: formData.get("description")
                })
              });

              const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id: string }>;
              if (!response.ok) {
                setError(getUserFriendlyError(payload, "转换失败，请稍后重试"));
                return;
              }

              router.push(`/projects/${(payload as ApiSuccessPayload<{ id: string }>).data?.id}`);
              router.refresh();
            });
          }}
        >
          <FormSection title="项目信息">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="opportunity-convert-name">项目名称</Label>
                <div className="mt-2">
                  <Input id="opportunity-convert-name" name="name" defaultValue={defaultName} />
                </div>
              </div>
              <div>
                <Label htmlFor="opportunity-convert-budget">预算金额</Label>
                <div className="mt-2">
                  <Input id="opportunity-convert-budget" name="budgetAmount" type="number" />
                </div>
              </div>
              <div>
                <Label htmlFor="opportunity-convert-start">计划开始日期</Label>
                <div className="mt-2">
                  <Input id="opportunity-convert-start" name="plannedStartDate" type="date" />
                </div>
              </div>
              <div>
                <Label htmlFor="opportunity-convert-end">计划结束日期</Label>
                <div className="mt-2">
                  <Input id="opportunity-convert-end" name="plannedEndDate" type="date" />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="opportunity-convert-description">说明</Label>
                <div className="mt-2">
                  <Textarea id="opportunity-convert-description" name="description" />
                </div>
              </div>
            </div>
          </FormSection>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={isPending}>{isPending ? "转换中..." : "转为项目"}</Button>
        </form>
    </SectionCard>
  );
}
