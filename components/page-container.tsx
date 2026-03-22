import { cn } from "@/lib/utils";

export function PageContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full space-y-5 px-5 py-5 md:px-6 md:py-6", className)} {...props} />;
}
