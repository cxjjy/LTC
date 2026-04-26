import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

type PageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  actions?: React.ReactNode;
  breadcrumbs?: {
    label: string;
    href?: string;
  }[];
  backHref?: string;
  backLabel?: string;
  backInActions?: boolean;
};

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  actions,
  breadcrumbs = [],
  backHref,
  backLabel = "返回",
  backInActions = false
}: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {breadcrumbs.length ? <PageBreadcrumb items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {backHref && !backInActions ? (
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{title}</h1>
            {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions || (backHref && backInActions) ? (
          <div className="flex flex-wrap items-center gap-3">
            {backHref && backInActions ? (
              <Button asChild variant="outline">
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Link>
              </Button>
            ) : null}
            {actions}
          </div>
        ) : actionLabel && actionHref ? (
          <Button asChild variant="default">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
