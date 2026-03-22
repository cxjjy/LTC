"use client";

import { leadCreateSchema, leadUpdateSchema } from "@/modules/leads/validation";
import { buildLeadFields } from "@/modules/leads/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type LeadFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  customerOptions: SelectOption[];
  leadId?: string;
};

export function LeadForm({ mode, defaultValues, customerOptions, leadId }: LeadFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建线索" : "编辑线索"}
      schema={mode === "create" ? leadCreateSchema : leadUpdateSchema}
      fields={buildLeadFields(customerOptions)}
      defaultValues={{
        customerId: "",
        title: "",
        source: "",
        contactName: "",
        contactPhone: "",
        expectedAmount: undefined,
        expectedCloseDate: "",
        latestFollowUpAt: "",
        description: "",
        status: "NEW",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/leads" : `/api/leads/${leadId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建线索" : "保存修改"}
      successHref={mode === "create" ? "/leads" : `/leads/${leadId}`}
    />
  );
}
