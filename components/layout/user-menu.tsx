"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";

import type { SessionUser } from "@/lib/auth";
import { roleLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";

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
  const [isPending, startTransition] = useTransition();
  const initials = useMemo(() => getInitials(user.name || user.username || "U"), [user.name, user.username]);

  return (
    <details
      className="relative"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[10px] border border-transparent px-2.5 py-1.5 transition-colors hover:bg-[var(--color-hover)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(59,130,246,0.12)] text-sm font-semibold text-[rgb(29,78,216)]">
          {initials}
        </div>
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium text-foreground">{user.name}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-[220px] rounded-[12px] border border-[rgba(229,231,235,0.96)] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="rounded-[10px] px-3 py-2.5">
          <div className="text-sm font-medium text-foreground">{user.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{roleLabels[user.role]}</div>
        </div>

        <div className="my-1 h-px bg-[rgba(229,231,235,0.9)]" />

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover)]"
        >
          <span className="inline-flex items-center gap-2 text-sm text-foreground">
            <UserCircle2 className="h-4 w-4 text-muted-foreground" />
            个人中心
          </span>
          <span className="text-xs text-muted-foreground">即将开放</span>
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover)]"
        >
          <span className="inline-flex items-center gap-2 text-sm text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            系统设置
          </span>
          <span className="text-xs text-muted-foreground">即将开放</span>
        </button>

        <div className="my-1 h-px bg-[rgba(229,231,235,0.9)]" />

        <Button
          variant="toolbar"
          className="w-full justify-start rounded-[10px] px-3"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            startTransition(async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            });
          }}
        >
          <LogOut className="h-4 w-4" />
          {isPending ? "退出中..." : "退出登录"}
        </Button>
      </div>
    </details>
  );
}
