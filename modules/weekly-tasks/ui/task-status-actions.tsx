"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";

export function TaskStatusActions({
  taskId,
  status,
  disabled = false
}: {
  taskId: string;
  status: "open" | "processing" | "done";
  disabled?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const actions =
    status === "open"
      ? [{ label: "开始处理", nextStatus: "processing" as const }]
      : status === "processing"
        ? [
            { label: "标记完成", nextStatus: "done" as const },
            { label: "重新打开", nextStatus: "open" as const }
          ]
        : [{ label: "重新打开", nextStatus: "open" as const }];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.nextStatus}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const response = await fetch(`/api/weekly-tasks/${taskId}/status`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: action.nextStatus })
                });
                const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ statusLabel: string }>;
                if (!response.ok) {
                  toast.error("任务更新失败", getUserFriendlyError(payload, "任务状态更新失败"));
                  return;
                }
                toast.success("任务已更新", `当前状态已切换为${action.label}`);
                router.refresh();
              } catch {
                toast.error("任务更新失败", "网络异常，请稍后重试");
              }
            })
          }
        >
          {isPending ? "处理中..." : action.label}
        </Button>
      ))}
    </div>
  );
}
