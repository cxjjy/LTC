"use client";

import { receivableCreateSchema, receivableUpdateSchema } from "@/modules/receivables/validation";
import { buildReceivableFields } from "@/modules/receivables/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type ReceivableFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  contractOptions: SelectOption[];
  receivableId?: string;
};

export function ReceivableForm({
  mode,
  defaultValues,
  contractOptions,
  receivableId
}: ReceivableFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建回款" : "编辑回款"}
      schema={mode === "create" ? receivableCreateSchema : receivableUpdateSchema}
      fields={buildReceivableFields(contractOptions)}
      defaultValues={{
        contractId: "",
        title: "",
        amountDue: undefined,
        dueDate: "",
        description: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/receivables" : `/api/receivables/${receivableId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建回款" : "保存修改"}
      successHref={
        mode === "create"
          ? (payload) => (payload.data?.id ? `/receivables/${payload.data.id}` : "/receivables")
          : `/receivables/${receivableId}`
      }
    />
  );
}
