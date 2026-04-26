import { PageHeader } from "@/components/page-header";
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
  backHref?: string;
  backLabel?: string;
  backInActions?: boolean;
};

export function PageShell({
  title,
  description,
  breadcrumbs = [],
  headerAction,
  backHref,
  backLabel,
  backInActions,
  className,
  children,
  ...props
}: PageShellProps) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="space-y-2 px-1">
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          backHref={backHref}
          backLabel={backLabel}
          backInActions={backInActions}
          actions={headerAction}
        />
      </div>
      {children}
    </div>
  );
}
