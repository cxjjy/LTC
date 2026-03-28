"use client";

import { customerCreateSchema, customerUpdateSchema } from "@/modules/customers/validation";
import { customerFields } from "@/modules/customers/ui/config";
import { EntityForm } from "@/components/forms/entity-form";

type CustomerFormProps = {
  mode: "create" | "edit";
  defaultValues: Record<string, unknown>;
  customerId?: string;
};

export function CustomerForm({ mode, defaultValues, customerId }: CustomerFormProps) {
  return (
    <EntityForm
      title={mode === "create" ? "新建客户" : "编辑客户"}
      schema={mode === "create" ? customerCreateSchema : customerUpdateSchema}
      fields={customerFields}
      defaultValues={{
        name: "",
        industry: "",
        contactName: "",
        contactPhone: "",
        address: "",
        remark: "",
        ...defaultValues
      }}
      submitUrl={mode === "create" ? "/api/customers" : `/api/customers/${customerId}`}
      submitMethod={mode === "create" ? "POST" : "PUT"}
      submitLabel={mode === "create" ? "创建客户" : "保存修改"}
      successHref={
        mode === "create"
          ? (payload) => (payload.data?.id ? `/customers/${payload.data.id}` : "/customers")
          : `/customers/${customerId}`
      }
    />
  );
}
