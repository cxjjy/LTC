import { SectionCard } from "@/components/section-card";

type DetailItem = {
  label: string;
  value: React.ReactNode;
};

export function DetailGrid({ title, items }: { title: string; items: DetailItem[] }) {
  return (
    <SectionCard title={title}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-[12px] border border-border bg-[rgba(249,250,251,0.9)] p-4">
              <div className="text-[12px] font-medium text-muted-foreground">{item.label}</div>
              <div className="mt-3 text-[15px] font-medium tracking-[-0.02em] text-foreground">{item.value || "-"}</div>
            </div>
          ))}
        </div>
    </SectionCard>
  );
}
