"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SelectOption } from "@/types/common";

export function ContractStatusForm({
  contractId,
  currentStatus,
  options
}: {
  contractId: string;
  currentStatus: string;
  options: SelectOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <SectionCard title="合同状态流转" description="合同状态变更将自动写入审计日志。">
      <div className="grid gap-4">
        <div>
          <Label>目标状态</Label>
          <div className="mt-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          disabled={isPending}
          onClick={() => {
            setError("");
            startTransition(async () => {
              const response = await fetch(`/api/contracts/${contractId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
              });
              const payload = await response.json();
              if (!response.ok) {
                setError(payload.error ?? "状态变更失败");
                return;
              }
              router.refresh();
            });
          }}
        >
          {isPending ? "提交中..." : "更新状态"}
        </Button>
      </div>
    </SectionCard>
  );
}
