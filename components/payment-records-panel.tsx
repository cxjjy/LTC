"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { paymentSourceTypeLabels } from "@/lib/constants";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/utils";

type PaymentRecordRow = {
  id: string;
  paymentAmount: number | string;
  paymentDate: string | Date;
  paymentMethod?: string | null;
  payerName?: string | null;
  sourceType: string;
  remark?: string | null;
};

type PaymentRecordsPanelProps = {
  contractId: string;
  records: PaymentRecordRow[];
  canManage: boolean;
};

const emptyForm = {
  paymentAmount: "",
  paymentDate: "",
  paymentMethod: "",
  payerName: "",
  remark: ""
};

export function PaymentRecordsPanel({ contractId, records, canManage }: PaymentRecordsPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<PaymentRecordRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isEdit = useMemo(() => Boolean(current), [current]);

  function openCreate() {
    setCurrent(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(record: PaymentRecordRow) {
    setCurrent(record);
    setForm({
      paymentAmount: String(record.paymentAmount),
      paymentDate: toDateInputValue(record.paymentDate),
      paymentMethod: record.paymentMethod || "",
      payerName: record.payerName || "",
      remark: record.remark || ""
    });
    setOpen(true);
  }

  async function submitForm() {
    try {
      setIsSubmitting(true);
      const response = await fetch(
        current ? `/api/payment-records/${current.id}` : `/api/contracts/${contractId}/payment-records`,
        {
          method: current ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...form,
            paymentAmount: Number(form.paymentAmount)
          })
        }
      );
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "保存失败，请稍后重试"));
      }
      toast.success("保存成功", current ? "回款记录已更新" : "回款记录已新增");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("保存失败", error instanceof Error ? error.message : "保存失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(record: PaymentRecordRow) {
    try {
      setDeletingId(record.id);
      const response = await fetch(`/api/payment-records/${record.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "删除失败，请稍后重试"));
      }
      toast.success("删除成功", "回款记录已删除");
      router.refresh();
    } catch (error) {
      toast.error("删除失败", error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SectionCard
      title="回款记录"
      description="记录合同回款明细，用于跟踪到账金额、日期、付款方式及付款方信息。"
      actions={
        canManage ? (
          <Button type="button" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增回款
          </Button>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>回款金额</TableHead>
              <TableHead>回款日期</TableHead>
              <TableHead>付款方式</TableHead>
              <TableHead>付款方</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length ? (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{formatCurrency(record.paymentAmount)}</TableCell>
                  <TableCell>{formatDate(record.paymentDate)}</TableCell>
                  <TableCell>{record.paymentMethod || "-"}</TableCell>
                  <TableCell>{record.payerName || "-"}</TableCell>
                  <TableCell>{paymentSourceTypeLabels[record.sourceType as keyof typeof paymentSourceTypeLabels] ?? record.sourceType}</TableCell>
                  <TableCell>{record.remark || "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {canManage && record.sourceType === "manual" ? (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(record)}>
                            <Pencil className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === record.id}
                            onClick={() => void handleDelete(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === record.id ? "删除中" : "删除"}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">财务同步记录暂不支持修改</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  暂无回款记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,640px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "编辑回款记录" : "新增回款记录"}</DialogTitle>
            <DialogDescription>请填写本次回款的到账信息，保存后将用于回款台账与合同收款跟踪。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="payment-amount">回款金额</Label>
              <div className="mt-2">
                <Input
                  id="payment-amount"
                  type="number"
                  value={form.paymentAmount}
                  onChange={(event) => setForm((value) => ({ ...value, paymentAmount: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payment-date">回款日期</Label>
              <div className="mt-2">
                <Input
                  id="payment-date"
                  type="date"
                  value={form.paymentDate}
                  onChange={(event) => setForm((value) => ({ ...value, paymentDate: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payment-method">付款方式</Label>
              <div className="mt-2">
                <Input
                  id="payment-method"
                  value={form.paymentMethod}
                  onChange={(event) => setForm((value) => ({ ...value, paymentMethod: event.target.value }))}
                  placeholder="例如 银行转账"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payment-payer">付款方</Label>
              <div className="mt-2">
                <Input
                  id="payment-payer"
                  value={form.payerName}
                  onChange={(event) => setForm((value) => ({ ...value, payerName: event.target.value }))}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="payment-remark">备注</Label>
              <div className="mt-2">
                <Input
                  id="payment-remark"
                  value={form.remark}
                  onChange={(event) => setForm((value) => ({ ...value, remark: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="button" onClick={() => void submitForm()} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
