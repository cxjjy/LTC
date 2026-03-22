"use client";

import { deliveryCreateSchema, deliveryUpdateSchema } from "@/modules/deliveries/validation";
import { buildDeliveryFields } from "@/modules/deliveries/ui/config";
import { EntityForm } from "@/components/forms/entity-form";
import type { SelectOption } from "@/types/common";

type DeliveryFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  projectOptions: SelectOption[];
  deliveryId?: string;
};

export function DeliveryForm({ mode, defaultValues, projectOptions, deliveryId }: DeliveryFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建交付" : "编辑交付"}
      schema={mode === "create" ? deliveryCreateSchema : deliveryUpdateSchema}
      fields={buildDeliveryFields(projectOptions)}
      defaultValues={{
        projectId: "",
        title: "",
        ownerName: "",
        plannedDate: "",
        actualDate: "",
        acceptanceDate: "",
        status: "NOT_STARTED",
        description: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/deliveries" : `/api/deliveries/${deliveryId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建交付" : "保存修改"}
      successHref={mode === "create" ? "/deliveries" : `/deliveries/${deliveryId}`}
    />
  );
}
