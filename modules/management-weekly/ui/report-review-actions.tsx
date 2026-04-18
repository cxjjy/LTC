"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";

export function ReportReviewActions({
  reportId
}: {
  reportId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [reviewNote, setReviewNote] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleAction(action: "review" | "return") {
    try {
      const response = await fetch(`/api/weekly-reports/${reportId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          action === "review"
            ? JSON.stringify({ reviewNote })
            : JSON.stringify({ returnNote })
      });
      const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload;
      if (!response.ok) {
        toast.error(action === "review" ? "审阅失败" : "退回失败", getUserFriendlyError(payload, "操作失败"));
        return;
      }
      toast.success(action === "review" ? "审阅成功" : "退回成功", "周报状态已更新");
      router.refresh();
    } catch {
      toast.error(action === "review" ? "审阅失败" : "退回失败", "网络异常，请稍后重试");
    }
  }

  return (
    <div className="grid gap-4 rounded-[12px] border border-border p-4">
      <div className="grid gap-3">
        <label className="text-sm font-medium text-foreground">审阅意见</label>
        <Textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="填写审阅结论或补充建议" />
      </div>
      <div className="grid gap-3">
        <label className="text-sm font-medium text-foreground">退回说明</label>
        <Textarea value={returnNote} onChange={(event) => setReturnNote(event.target.value)} placeholder="若需退回，请说明需补充或修正的内容" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={() => startTransition(() => handleAction("review"))}>
          审阅通过
        </Button>
        <Button variant="outline" disabled={isPending} onClick={() => startTransition(() => handleAction("return"))}>
          退回修改
        </Button>
      </div>
    </div>
  );
}
