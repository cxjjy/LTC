import Link from "next/link";
import { ChevronRight } from "lucide-react";

type PageBreadcrumbItem = {
  label: string;
  href?: string;
};

type PageBreadcrumbProps = {
  items: PageBreadcrumbItem[];
};

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, index) => (
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
  );
}
