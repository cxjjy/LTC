"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";

export function UserStatusButton({
  userId,
  isActive
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch(`/api/system/users/${userId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !isActive })
          });
          const payload = (await response.json()) as ApiErrorPayload;

          if (!response.ok) {
            toast.error("操作失败", getUserFriendlyError(payload, "账号状态更新失败，请稍后重试"));
            return;
          }

          toast.success("操作成功", isActive ? "账号已禁用" : "账号已启用");
          router.refresh();
        })
      }
    >
      {isPending ? "处理中..." : isActive ? "禁用" : "启用"}
    </Button>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setPassword("123456");
          setError("");
          setOpen(true);
        }}
      >
        重置密码
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,420px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
            <DialogDescription>默认会重置为 `123456`，你也可以改成新的临时密码。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">新密码</Label>
              <Input
                id="reset-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入新密码"
              />
              <p className="text-xs text-muted-foreground">建议重置后通知用户首次登录立即修改密码。</p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                取消
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    setError("");

                    if (!password.trim()) {
                      setError("请输入新密码");
                      return;
                    }

                    const response = await fetch(`/api/system/users/${userId}/reset-password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ password: password.trim() })
                    });
                    const payload = (await response.json()) as ApiErrorPayload;

                    if (!response.ok) {
                      setError(getUserFriendlyError(payload, "密码重置失败，请稍后重试"));
                      return;
                    }

                    toast.success("重置成功", `密码已重置为：${password.trim()}`);
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                {isPending ? "重置中..." : "确认重置"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
