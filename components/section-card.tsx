import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  className,
  contentClassName,
  children,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
