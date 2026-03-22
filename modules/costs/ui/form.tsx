"use client";

import { costCreateSchema, costUpdateSchema } from "@/modules/costs/validation";
import { buildCostFields } from "@/modules/costs/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type CostFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  projectOptions: SelectOption[];
  costId?: string;
};

export function CostForm({ mode, defaultValues, projectOptions, costId }: CostFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建成本" : "编辑成本"}
      schema={mode === "create" ? costCreateSchema : costUpdateSchema}
      fields={buildCostFields(projectOptions)}
      defaultValues={{
        projectId: "",
        title: "",
        category: "PROCUREMENT",
        amount: undefined,
        occurredAt: "",
        description: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/costs" : `/api/costs/${costId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建成本" : "保存修改"}
      successHref={mode === "create" ? "/costs" : `/costs/${costId}`}
    />
  );
}
