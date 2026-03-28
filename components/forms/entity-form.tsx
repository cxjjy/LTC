"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/form-section";
import { PageContainer } from "@/components/page-container";
import { SectionCard } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import type { SelectOption } from "@/types/common";

export type EntityFormField<T = unknown> = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select";
  placeholder?: string;
  options?: SelectOption[];
  _type?: T;
};

type EntityFormProps = {
  title: string;
  schema: ZodType<any>;
  fields: EntityFormField[];
  defaultValues: Record<string, unknown>;
  submitUrl: string;
  submitMethod: "POST" | "PUT";
  submitLabel: string;
  successHref: string | ((payload: { success: boolean; data?: { id?: string } }) => string);
};

export function EntityForm({
  title,
  schema,
  fields,
  defaultValues,
  submitUrl,
  submitMethod,
  submitLabel,
  successHref
}: EntityFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues
  });

  const onSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const response = await fetch(submitUrl, {
        method: submitMethod,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id?: string }>;

      if (!response.ok) {
        setError(getUserFriendlyError(payload, "提交失败，请稍后重试"));
        return;
      }

      const targetHref =
        typeof successHref === "function"
          ? successHref(payload as ApiSuccessPayload<{ id?: string }>)
          : successHref;
      router.push(targetHref);
      router.refresh();
    });
  });

  const midpoint = Math.ceil(fields.length / 2);
  const basicFields = fields.slice(0, midpoint);
  const businessFields = fields.slice(midpoint);

  return (
    <PageContainer className="space-y-6">
      <SectionCard title={title} description="请按业务流程完整填写字段信息。">
        <form onSubmit={onSubmit} className="grid gap-6">
          <FormSection title="基本信息">
            <div className="grid gap-4 md:grid-cols-2">
              {basicFields.map((field) => (
                <FieldRenderer key={field.name} field={field} form={form} />
              ))}
            </div>
          </FormSection>
          {businessFields.length ? (
            <FormSection title="业务信息">
              <div className="grid gap-4 md:grid-cols-2">
                {businessFields.map((field) => (
                  <FieldRenderer key={field.name} field={field} form={form} />
                ))}
              </div>
            </FormSection>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "提交中..." : submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              返回
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}

function FieldRenderer({
  field,
  form
}: {
  field: EntityFormField;
  form: ReturnType<typeof useForm<Record<string, unknown>>>;
}) {
  return (
    <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
      <Label htmlFor={field.name}>{field.label}</Label>
      <div className="mt-2">
        {field.type === "textarea" ? (
          <Textarea id={field.name} placeholder={field.placeholder} {...form.register(field.name)} />
        ) : field.type === "select" ? (
          <Select
            defaultValue={String(form.getValues(field.name) ?? "")}
            onValueChange={(value) => form.setValue(field.name, value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`请选择${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={field.name}
            type={field.type}
            placeholder={field.placeholder}
            {...form.register(field.name)}
          />
        )}
      </div>
      {form.formState.errors[field.name] ? (
        <p className="mt-1.5 text-sm text-destructive">
          {String(form.formState.errors[field.name]?.message ?? "")}
        </p>
      ) : null}
    </div>
  );
}
