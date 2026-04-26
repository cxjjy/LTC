"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initials = useMemo(() => getInitials(user.name || user.username || "U"), [user.name, user.username]);

  return (
    <details
      className="relative"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="enterprise-user-trigger flex cursor-pointer list-none items-center gap-2 border border-transparent transition-colors hover:bg-[var(--color-hover)]">
        <div className="enterprise-user-avatar flex items-center justify-center rounded-full bg-[rgba(59,130,246,0.12)] font-semibold text-[rgb(29,78,216)]">
          {initials}
        </div>
        <div className="hidden text-left md:block">
          <div className="enterprise-user-name text-foreground">{user.name}</div>
        </div>
        <ChevronDown className="h-[14px] w-[14px] text-muted-foreground" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-[220px] rounded-[12px] border border-[rgba(229,231,235,0.96)] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="rounded-[10px] px-3 py-2.5">
          <div className="enterprise-user-name text-foreground">{user.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{user.roleName}</div>
        </div>

        <div className="my-1 h-px bg-[rgba(229,231,235,0.9)]" />

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover)]"
        >
          <span className="inline-flex items-center gap-2 text-sm text-foreground">
            <UserCircle2 className="h-4 w-4 text-muted-foreground" />
            个人信息
          </span>
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover)]"
        >
          <span className="inline-flex items-center gap-2 text-sm text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            系统设置
          </span>
        </button>

        <div className="my-1 h-px bg-[rgba(229,231,235,0.9)]" />

        <Button
          variant="toolbar"
          className="w-full justify-start rounded-[10px] px-3"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setConfirmOpen(true);
          }}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[min(92vw,420px)] rounded-[18px] p-6">
          <DialogHeader>
            <DialogTitle>确认退出登录</DialogTitle>
            <DialogDescription>退出后将返回登录页，如有未保存内容请先完成保存。</DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setConfirmOpen(false);
                  router.push("/login");
                });
              }}
            >
              {isPending ? "退出中..." : "确认退出"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </details>
  );
}
