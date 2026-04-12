"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="toolbar" onClick={() => setOpen(true)} disabled={isPending}>
        退出登录
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,420px)] rounded-[18px] p-6">
          <DialogHeader>
            <DialogTitle>确认退出登录</DialogTitle>
            <DialogDescription>退出后将返回登录页，如有未保存内容请先完成保存。</DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setOpen(false);
                  router.push("/login");
                  router.refresh();
                });
              }}
            >
              {isPending ? "退出中..." : "确认退出"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
