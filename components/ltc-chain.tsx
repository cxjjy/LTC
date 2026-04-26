import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/section-card";
import { cn } from "@/lib/utils";

export type ChainNode = {
  label: string;
  value: string;
  status?: string;
  href?: string;
  active?: boolean;
};

export function LtcChain({
  title = "LTC 链路",
  nodes
}: {
  title?: string;
  nodes: ChainNode[];
}) {
  return (
    <SectionCard title={title} description="从上游到下游保持可追溯的业务链路。">
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((node, index) => {
          const content = (
            <div
              className={cn(
                "flex min-w-[150px] items-center justify-between gap-3 rounded-[12px] border border-border bg-[rgba(249,250,251,0.95)] px-4 py-3",
                node.active && "border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.06)]"
              )}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{node.label}</div>
                <div className="mt-1 truncate text-sm font-medium tracking-[-0.02em] text-foreground">{node.value}</div>
              </div>
              {node.status ? <Badge variant={node.active ? "default" : "muted"}>{node.status}</Badge> : null}
            </div>
          );

          return (
            <div key={`${node.label}-${node.value}`} className="flex items-center gap-2">
              {node.href ? <Link href={node.href}>{content}</Link> : content}
              {index < nodes.length - 1 ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
