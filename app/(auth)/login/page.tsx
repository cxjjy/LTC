"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Building2, ChartColumn, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const highlights = [
  {
    icon: Building2,
    title: "项目全周期协同",
    description: "客户、线索、商机、项目与合同统一收口，支撑企业项目管理与经营协同。"
  },
  {
    icon: BriefcaseBusiness,
    title: "项目工作台视角",
    description: "以列表、操作栏、表格和详情面板为核心，贴近真实项目管理与经营系统。"
  },
  {
    icon: ChartColumn,
    title: "经营数据闭环",
    description: "成本、回款、毛利和审计记录形成完整追踪链路，便于本地演示与联调。"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function normalizeLoginError(payload: { error?: string; issues?: Array<{ message?: string }> }) {
    if (payload.issues?.[0]?.message) {
      return payload.issues[0].message;
    }

    switch (payload.error) {
      case "请求参数校验失败":
        return "请输入用户名和密码";
      case "用户名或密码错误":
        return "用户名或密码不正确，请重新输入";
      case "请先登录":
        return "登录状态已失效，请重新登录";
      case "服务器内部错误":
        return "登录暂时不可用，请稍后重试";
      default:
        return payload.error || "登录失败，请稍后重试";
    }
  }

  function normalizeQueryError(errorCode: string | null) {
    switch (errorCode) {
      case "dingtalk_state_invalid":
        return "钉钉登录校验失败，请重新发起登录";
      case "dingtalk_token_failed":
        return "钉钉授权令牌获取失败，请稍后重试";
      case "dingtalk_userid_missing":
      case "dingtalk_userinfo_failed":
        return "钉钉用户信息获取失败，请联系管理员";
      case "dingtalk_binding_failed":
        return "本地账户绑定失败，请联系管理员";
      case "dingtalk_session_failed":
        return "登录会话创建失败，请稍后重试";
      case "dingtalk_oauth_failed":
        return "钉钉登录失败，请稍后重试";
      default:
        return "";
    }
  }

  useEffect(() => {
    const queryError = normalizeQueryError(new URLSearchParams(window.location.search).get("error"));
    if (queryError) {
      setError(queryError);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="flex min-h-screen">
        <section className="hidden w-[40%] min-w-[420px] border-r border-[rgba(229,231,235,0.96)] bg-[#fbfbfc] xl:flex xl:flex-col">
          <div className="border-b border-[rgba(229,231,235,0.96)] px-10 py-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--color-primary)] text-lg font-semibold text-white">
                LTC
              </div>
              <div>
                <div className="text-[28px] font-semibold tracking-[-0.04em] text-foreground">LTC项目管理</div>
                <div className="mt-1 text-sm text-muted-foreground">项目全生命周期管理平台</div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-10 py-10">
            <div className="max-w-[420px]">
              <div className="inline-flex items-center gap-2 rounded-[10px] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-sm font-medium text-[rgb(29,78,216)]">
                <ShieldCheck className="h-4 w-4" />
                项目管理 / 经营工作台
              </div>
              <h1 className="mt-6 text-[42px] font-semibold leading-[1.15] tracking-[-0.05em] text-foreground">
                LTC项目管理
              </h1>
              <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                面向项目、客户、交付与资金协同的本地业务系统。围绕线索、商机、项目、合同、交付、成本与回款，形成结构稳定、链路清晰的项目管理工作台。
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[12px] border border-[rgba(229,231,235,0.96)] bg-white px-5 py-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f3f6fb] text-[rgb(37,99,235)]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-foreground">{item.title}</div>
                      <div className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[440px] rounded-[12px] border border-[rgba(229,231,235,0.96)] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            <div className="border-b border-[rgba(229,231,235,0.92)] px-8 py-6">
              <div className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">登录系统</div>
              <div className="mt-2 text-sm text-muted-foreground">请输入账号和密码登录项目管理工作台</div>
            </div>

            <div className="px-8 py-7">
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError("");
                  const formData = new FormData(event.currentTarget);
                  const username = String(formData.get("username") ?? "").trim();
                  const password = String(formData.get("password") ?? "");

                  if (!username && !password) {
                    setError("请输入用户名和密码");
                    return;
                  }

                  if (!username) {
                    setError("请输入用户名");
                    return;
                  }

                  if (!password) {
                    setError("请输入密码");
                    return;
                  }

                  startTransition(async () => {
                    const response = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ username, password })
                    });

                    const payload = (await response.json()) as {
                      success?: boolean;
                      error?: string;
                      issues?: Array<{ message?: string }>;
                    };

                    if (!response.ok) {
                      setError(normalizeLoginError(payload));
                      return;
                    }

                    router.push("/dashboard");
                  });
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input id="username" name="username" placeholder="请输入账号" autoComplete="username" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    autoComplete="current-password"
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button disabled={isPending} className="h-10 w-full justify-center">
                  {isPending ? "登录中..." : "进入系统"}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button asChild type="button" variant="outline" className="h-10 w-full justify-center gap-2">
                  <Link href="/api/auth/dingtalk/login">
                    <Image src="/dingtalk.svg" alt="钉钉" width={18} height={18} className="h-[18px] w-[18px]" />
                    使用钉钉登录
                  </Link>
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
