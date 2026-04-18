"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SearchableSelect } from "@/components/common/SearchableSelect";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";
import type { SelectOption } from "@/types/common";

export function ProjectStatusForm({
  projectId,
  currentStatus,
  options
}: {
  projectId: string;
  currentStatus: string;
  options: SelectOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <SectionCard title="项目状态流转" description="在服务端校验允许的状态切换。">
      <div className="grid gap-4">
        <div>
          <Label>目标状态</Label>
          <div className="mt-2">
            <SearchableSelect
              value={status}
              onValueChange={setStatus}
              options={options}
              placeholder="请选择目标状态"
              searchPlaceholder="搜索状态"
              clearable={false}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          disabled={isPending}
          onClick={() => {
            setError("");
            startTransition(async () => {
              const response = await fetch(`/api/projects/${projectId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
              });
              const payload = (await response.json()) as ApiErrorPayload;
              if (!response.ok) {
                setError(getUserFriendlyError(payload, "状态变更失败，请稍后重试"));
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
