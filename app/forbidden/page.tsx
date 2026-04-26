import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-6">
      <div className="surface-card-strong w-full max-w-[520px] rounded-[20px] p-10 text-center">
        <div className="text-[40px] font-semibold tracking-[-0.05em] text-foreground">403</div>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-foreground">无权限访问</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          当前账号缺少访问该页面或执行该操作的权限，请联系系统管理员分配角色。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">返回首页</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">重新登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
