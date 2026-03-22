"use client";

import { opportunityCreateSchema, opportunityUpdateSchema } from "@/modules/opportunities/validation";
import { buildOpportunityFields } from "@/modules/opportunities/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type OpportunityFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  customerOptions: SelectOption[];
  opportunityId?: string;
};

export function OpportunityForm({
  mode,
  defaultValues,
  customerOptions,
  opportunityId
}: OpportunityFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建商机" : "编辑商机"}
      schema={mode === "create" ? opportunityCreateSchema : opportunityUpdateSchema}
      fields={buildOpportunityFields(customerOptions)}
      defaultValues={{
        customerId: "",
        name: "",
        amount: undefined,
        expectedSignDate: "",
        winRate: undefined,
        stage: "DISCOVERY",
        description: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/opportunities" : `/api/opportunities/${opportunityId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建商机" : "保存修改"}
      successHref={mode === "create" ? "/opportunities" : `/opportunities/${opportunityId}`}
    />
  );
}
