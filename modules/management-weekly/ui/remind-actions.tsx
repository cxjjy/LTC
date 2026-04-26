"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";

export function RemindActions({
  week,
  targetUserIds
}: {
  week: string;
  targetUserIds?: string[];
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const response = await fetch(`/api/management/weekly-summary/${week}/remind`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ targetUserIds })
            });
            const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ remindedCount: number }>;
            if (!response.ok) {
              toast.error("催办失败", getUserFriendlyError(payload, "催办接口执行失败"));
              return;
            }
            toast.success(
              "催办已记录",
              targetUserIds?.length ? "已为选中人员生成催办记录" : "已生成批量催办记录"
            );
          } catch {
            toast.error("催办失败", "网络异常，请稍后重试");
          }
        })
      }
    >
      {targetUserIds?.length ? "催办" : "批量催办"}
    </Button>
  );
}
