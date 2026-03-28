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

export function LeadConvertForm({
  leadId,
  defaultName,
  defaultAmount
}: {
  leadId: string;
  defaultName: string;
  defaultAmount?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <SectionCard title="线索转商机" description="转换动作将写入事务与审计日志。">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const response = await fetch(`/api/leads/${leadId}/convert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: formData.get("name"),
                  amount: formData.get("amount"),
                  expectedSignDate: formData.get("expectedSignDate"),
                  winRate: formData.get("winRate"),
                  description: formData.get("description")
                })
              });

              const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id: string }>;
              if (!response.ok) {
                setError(getUserFriendlyError(payload, "转换失败，请稍后重试"));
                return;
              }

              router.push(`/opportunities/${(payload as ApiSuccessPayload<{ id: string }>).data?.id}`);
              router.refresh();
            });
          }}
        >
          <FormSection title="商机信息">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="lead-convert-name">商机名称</Label>
                <div className="mt-2">
                  <Input id="lead-convert-name" name="name" defaultValue={defaultName} />
                </div>
              </div>
              <div>
                <Label htmlFor="lead-convert-amount">商机金额</Label>
                <div className="mt-2">
                  <Input id="lead-convert-amount" name="amount" type="number" defaultValue={defaultAmount ?? ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="lead-convert-date">预计签约日期</Label>
                <div className="mt-2">
                  <Input id="lead-convert-date" name="expectedSignDate" type="date" />
                </div>
              </div>
              <div>
                <Label htmlFor="lead-convert-rate">赢率</Label>
                <div className="mt-2">
                  <Input id="lead-convert-rate" name="winRate" type="number" defaultValue={50} />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="lead-convert-description">说明</Label>
                <div className="mt-2">
                  <Textarea id="lead-convert-description" name="description" />
                </div>
              </div>
            </div>
          </FormSection>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={isPending}>{isPending ? "转换中..." : "转为商机"}</Button>
        </form>
    </SectionCard>
  );
}
