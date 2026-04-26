import { cn } from "@/lib/utils";

export function FormSection({
  title,
  description,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
}) {
  return (
    <section className={cn("rounded-[16px] border border-border bg-[rgba(249,250,251,0.9)] p-4 md:p-5", className)} {...props}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {props.children}
    </section>
  );
}
