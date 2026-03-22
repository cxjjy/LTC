"use client";

import { contractCreateSchema, contractUpdateSchema } from "@/modules/contracts/validation";
import { buildContractFields } from "@/modules/contracts/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type ContractFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  projectOptions: SelectOption[];
  contractId?: string;
};

export function ContractForm({ mode, defaultValues, projectOptions, contractId }: ContractFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建合同" : "编辑合同"}
      schema={mode === "create" ? contractCreateSchema : contractUpdateSchema}
      fields={buildContractFields(projectOptions)}
      defaultValues={{
        projectId: "",
        name: "",
        contractAmount: undefined,
        signedDate: "",
        effectiveDate: "",
        endDate: "",
        status: "DRAFT",
        description: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/contracts" : `/api/contracts/${contractId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建合同" : "保存修改"}
      successHref={mode === "create" ? "/contracts" : `/contracts/${contractId}`}
    />
  );
}
