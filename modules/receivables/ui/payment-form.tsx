"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/form-section";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";

export function ReceivablePaymentForm({
  receivableId,
  defaultAmountReceived
}: {
  receivableId: string;
  defaultAmountReceived: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <SectionCard title="到账维护" description="仅财务角色可维护回款到账信息。">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const response = await fetch(`/api/receivables/${receivableId}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amountReceived: formData.get("amountReceived"),
                  receivedDate: formData.get("receivedDate")
                })
              });
              const payload = (await response.json()) as ApiErrorPayload;
              if (!response.ok) {
                setError(getUserFriendlyError(payload, "回款更新失败，请稍后重试"));
                return;
              }
              router.refresh();
            });
          }}
        >
          <FormSection title="回款更新">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="payment-amount">已收金额</Label>
                <div className="mt-2">
                  <Input id="payment-amount" name="amountReceived" type="number" defaultValue={defaultAmountReceived} />
                </div>
              </div>
              <div>
                <Label htmlFor="payment-date">到账日期</Label>
                <div className="mt-2">
                  <Input id="payment-date" name="receivedDate" type="date" />
                </div>
              </div>
            </div>
          </FormSection>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={isPending}>{isPending ? "提交中..." : "更新回款"}</Button>
        </form>
    </SectionCard>
  );
}
