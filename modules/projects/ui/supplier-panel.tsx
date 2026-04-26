"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, Trash2 } from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";
import { formatDateTime } from "@/lib/utils";

type ProjectSupplierRow = {
  id: string;
  role?: string | null;
  remark?: string | null;
  createdAt?: string | Date;
  supplier?: {
    id: string;
    code: string;
    name: string;
    contactName?: string | null;
    contactPhone?: string | null;
  } | null;
};

type SupplierPanelProps = {
  projectId: string;
  suppliers: ProjectSupplierRow[];
  canManage: boolean;
};

type ExistingSupplierOption = {
  value: string;
  label: string;
  keywords?: string[];
};

const emptyForm = {
  supplierId: "",
  supplierName: "",
  contactName: "",
  contactPhone: "",
  role: "",
  remark: ""
};

export function ProjectSupplierPanel({ projectId, suppliers, canManage }: SupplierPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [linkMode, setLinkMode] = useState<"existing" | "create">("existing");
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [existingSuppliers, setExistingSuppliers] = useState<ExistingSupplierOption[]>([]);
  const deferredSupplierQuery = useDeferredValue(supplierQuery);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const search = new URL("/api/options/suppliers", window.location.origin);
        search.searchParams.set("q", deferredSupplierQuery);
        search.searchParams.set("limit", "20");

        const response = await fetch(search.toString(), {
          credentials: "same-origin"
        });
        const payload = (await response.json()) as { success?: boolean; data?: { items?: ExistingSupplierOption[] } };

        if (!cancelled && response.ok) {
          setExistingSuppliers(payload.data?.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setExistingSuppliers([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deferredSupplierQuery, open]);

  const filteredSuppliers = useMemo(() => {
    const keyword = deferredSupplierQuery.trim().toLowerCase();
    if (!keyword) {
      return existingSuppliers;
    }

    return existingSuppliers.filter((item) => {
      const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [deferredSupplierQuery, existingSuppliers]);

  const selectedSupplier = useMemo(
    () => existingSuppliers.find((item) => item.value === form.supplierId) ?? null,
    [existingSuppliers, form.supplierId]
  );

  function resetForm() {
    setForm(emptyForm);
    setSupplierQuery("");
    setSupplierPickerOpen(false);
    setLinkMode("existing");
  }

  function submit() {
    setIsSubmitting(true);
    void (async () => {
      const response = await fetch(`/api/projects/${projectId}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok || !payload.success) {
        toast.error("关联失败", getUserFriendlyError(payload, "供应商关联失败，请稍后重试"));
        return;
      }

      toast.success("关联成功", "供应商已加入当前项目");
      setOpen(false);
      resetForm();
      router.refresh();
    })()
      .catch(() => toast.error("关联失败", "系统暂时不可用，请稍后重试"))
      .finally(() => setIsSubmitting(false));
  }

  function remove(linkId: string) {
    setIsSubmitting(true);
    void (async () => {
      const response = await fetch(`/api/projects/${projectId}/suppliers/${linkId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok || !payload.success) {
        toast.error("解除失败", getUserFriendlyError(payload, "供应商解除失败，请稍后重试"));
        return;
      }

      toast.success("已解除关联");
      router.refresh();
    })()
      .catch(() => toast.error("解除失败", "系统暂时不可用，请稍后重试"))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <SectionCard
      title="供应商信息"
      description="一个项目可关联多个供应商，采购合同、进项发票和付款记录围绕供应商侧业务展开。"
      actions={
        canManage ? (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            关联供应商
          </Button>
        ) : null
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>供应商</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>合作角色</TableHead>
              <TableHead>关联时间</TableHead>
              <TableHead>备注</TableHead>
              {canManage ? <TableHead className="w-20 text-right">操作</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length ? (
              suppliers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.supplier ? `${item.supplier.code} / ${item.supplier.name}` : "供应商记录缺失"}
                  </TableCell>
                  <TableCell>{item.supplier?.contactName || "-"}</TableCell>
                  <TableCell>{item.supplier?.contactPhone || "-"}</TableCell>
                  <TableCell>{item.role || "-"}</TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>{item.remark || "-"}</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  当前项目还没有关联供应商
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetForm();
          }
        }}
      >
        <DialogContent className="w-[min(92vw,680px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>关联供应商</DialogTitle>
            <DialogDescription>选择已有供应商，或输入供应商名称创建后关联到当前项目。</DialogDescription>
          </DialogHeader>
          <div className="inline-flex w-fit rounded-[12px] border border-border bg-[rgba(248,250,252,0.9)] p-1">
            <button
              type="button"
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                linkMode === "existing"
                  ? "bg-white text-[rgb(29,78,216)] shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setLinkMode("existing");
                setSupplierPickerOpen(false);
              }}
            >
              选择已有供应商
            </button>
            <button
              type="button"
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                linkMode === "create"
                  ? "bg-white text-[rgb(29,78,216)] shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setLinkMode("create");
                setSupplierPickerOpen(false);
                setForm((current) => ({ ...current, supplierId: "" }));
              }}
            >
              新建供应商
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>已有供应商</Label>
              {linkMode === "existing" ? (
                <div className="relative z-[120]" style={{ isolation: "isolate" }}>
                  <button
                    type="button"
                    className="control-surface flex h-11 w-full items-center justify-between rounded-[12px] px-3 text-left text-sm transition-all duration-150 hover:border-[rgba(59,130,246,0.32)] focus-visible:border-[rgba(59,130,246,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.16)]"
                    onClick={() => setSupplierPickerOpen((current) => !current)}
                  >
                    <span className={selectedSupplier ? "text-foreground" : "text-muted-foreground"}>
                      {selectedSupplier?.label || "搜索并选择已有供应商"}
                    </span>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </button>

                  {supplierPickerOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[140] rounded-[14px] border border-[rgba(203,213,225,0.95)] bg-white p-3 opacity-100 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={supplierQuery}
                          placeholder="搜索供应商名称或编号"
                          className="pl-9 pr-9"
                          autoFocus
                          onChange={(event) => setSupplierQuery(event.target.value)}
                        />
                        {form.supplierId ? (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition hover:text-foreground"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                supplierId: ""
                              }))
                            }
                          >
                            清空
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 max-h-56 overflow-y-auto rounded-[10px] border border-[rgba(226,232,240,0.95)] bg-white">
                        {filteredSuppliers.length ? (
                          filteredSuppliers.map((item) => {
                            const selected = form.supplierId === item.value;

                            return (
                              <button
                                key={item.value}
                                type="button"
                                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                                  selected
                                    ? "bg-[rgba(59,130,246,0.10)] text-[rgb(29,78,216)]"
                                    : "hover:bg-[var(--color-hover)]"
                                }`}
                                onClick={() => {
                                  setForm((current) => ({
                                    ...current,
                                    supplierId: item.value,
                                    supplierName: ""
                                  }));
                                  setSupplierPickerOpen(false);
                                  setSupplierQuery("");
                                }}
                              >
                                <span>{item.label}</span>
                                {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-6 text-sm text-muted-foreground">无匹配结果</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                  切换到“新建供应商”模式后，将创建一条新的供应商记录并关联到当前项目。
                </div>
              )}
            </div>
            {linkMode === "create" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">新供应商名称</Label>
                  <Input
                    id="supplier-name"
                    value={form.supplierName}
                    placeholder="没有已有供应商时填写"
                    onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-role">合作角色</Label>
                  <Input
                    id="supplier-role"
                    value={form.role}
                    placeholder="例如：硬件供货 / 实施交付"
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-contact">联系人</Label>
                  <Input
                    id="supplier-contact"
                    value={form.contactName}
                    onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">联系电话</Label>
                  <Input
                    id="supplier-phone"
                    value={form.contactPhone}
                    onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplier-remark">备注</Label>
                  <Input
                    id="supplier-remark"
                    value={form.remark}
                    onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-[12px] border border-border/70 bg-[rgba(248,250,252,0.75)] px-3 py-3 text-sm text-muted-foreground md:col-span-2">
                选择已有供应商后，直接点击“确认关联”即可。
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={submit}>
              {isSubmitting ? "提交中..." : "确认关联"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
