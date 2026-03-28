"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteAction } from "@/lib/use-delete-action";

export type DeleteActionProps = {
  moduleLabel: string;
  recordLabel: string;
  endpoint: string;
  warning?: string;
  redirectTo?: string;
  variant?: "button" | "menu";
  onDeleted?: () => void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  moduleLabel,
  recordLabel,
  warning,
  isDeleting,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleLabel: string;
  recordLabel: string;
  warning?: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,560px)] rounded-[18px]">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            你确定要删除这条{moduleLabel}记录吗？
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3">
            当前记录：{recordLabel}
          </div>
          <p>删除后该记录将不会出现在默认列表中。</p>
          <p>此操作会保留审计日志，如需恢复请联系管理员。</p>
          {warning ? (
            <div className="rounded-[12px] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-[rgb(180,83,9)]">
              {warning}
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            取消
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "删除中" : "确认删除"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAction({
  moduleLabel,
  recordLabel,
  endpoint,
  warning,
  redirectTo,
  variant = "button",
  onDeleted
}: DeleteActionProps) {
  const [open, setOpen] = useState(false);
  const { isDeleting, executeDelete } = useDeleteAction();

  async function handleConfirm() {
    const success = await executeDelete({
      endpoint,
      redirectTo,
      onSuccess: onDeleted
    });

    if (success) {
      setOpen(false);
    }
  }

  return (
    <>
      {variant === "menu" ? (
        <button
          type="button"
          className="mt-1 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-[rgb(185,28,28)] transition hover:bg-[rgba(239,68,68,0.08)]"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          删除
        </button>
      ) : (
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" />
          删除
        </Button>
      )}

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        moduleLabel={moduleLabel}
        recordLabel={recordLabel}
        warning={warning}
        isDeleting={isDeleting}
        onConfirm={handleConfirm}
      />
    </>
  );
}
