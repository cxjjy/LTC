import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageShellProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  headerAction?: React.ReactNode;
};

export function PageShell({
  title,
  description,
  breadcrumbs = [],
  headerAction,
  className,
  children,
  ...props
}: PageShellProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div className="space-y-2 px-1">
        {breadcrumbs.length ? (
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                {item.href ? (
                  <Link href={item.href} className="transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {headerAction}
        </div>
      </div>
      {children}
    </div>
  );
}
