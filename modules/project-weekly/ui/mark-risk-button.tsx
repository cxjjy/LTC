"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";

export function MarkProjectRiskButton({
  week,
  projectId,
  disabled = false
}: {
  week: string;
  projectId: string;
  disabled?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const response = await fetch(`/api/project-weekly/${week}/${projectId}/mark-risk`, {
              method: "POST"
            });
            const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ marked: boolean }>;
            if (!response.ok) {
              toast.error("标记失败", getUserFriendlyError(payload, "风险标记更新失败"));
              return;
            }
            toast.success("已标记风险", "该项目已提升为红灯关注项目");
            router.refresh();
          } catch {
            toast.error("标记失败", "网络异常，请稍后重试");
          }
        })
      }
    >
      {isPending ? "标记中..." : "标记风险"}
    </Button>
  );
}
