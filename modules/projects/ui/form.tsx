"use client";

import { projectCreateSchema, projectUpdateSchema } from "@/modules/projects/validation";
import { buildProjectFields } from "@/modules/projects/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type ProjectFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  opportunityOptions: SelectOption[];
  projectId?: string;
};

export function ProjectForm({ mode, defaultValues, opportunityOptions, projectId }: ProjectFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建项目" : "编辑项目"}
      schema={mode === "create" ? projectCreateSchema : projectUpdateSchema}
      fields={buildProjectFields(opportunityOptions)}
      defaultValues={{
        opportunityId: "",
        name: "",
        budgetAmount: undefined,
        plannedStartDate: "",
        plannedEndDate: "",
        deliveryMode: "",
        region: "",
        ownerName: "",
        status: "INITIATING",
        description: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/projects" : `/api/projects/${projectId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建项目" : "保存修改"}
      successHref={
        mode === "create"
          ? (payload) => (payload.data?.id ? `/projects/${payload.data.id}` : "/projects")
          : `/projects/${projectId}`
      }
    />
  );
}
