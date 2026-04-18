"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Pencil, Plus, ReceiptText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  invoiceStatusLabels,
  invoiceStatusOptions,
  invoiceTypeLabels,
  invoiceTypeOptions
} from "@/lib/constants";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/utils";

type InvoiceRecordRow = {
  id: string;
  invoiceNo: string;
  invoiceType: string;
  invoiceAmount: number | string;
  invoiceDate: string | Date;
  payerName?: string | null;
  status: string;
  attachment?: {
    id: string;
    fileName: string;
    fileUrl: string;
    remark?: string | null;
  } | null;
};

type InvoiceRecordsPanelProps = {
  contractId: string;
  records: InvoiceRecordRow[];
  canManage: boolean;
};

const emptyForm = {
  invoiceNo: "",
  invoiceType: "special",
  invoiceAmount: "",
  invoiceDate: "",
  payerName: "",
  status: "issued"
};

function getInvoiceStatusBadgeVariant(status: string): "success" | "muted" | "danger" | "default" {
  if (status === "issued") {
    return "success";
  }

  if (status === "voided") {
    return "muted";
  }

  if (status === "red_flush") {
    return "danger";
  }

  return "default";
}

export function InvoiceRecordsPanel({ contractId, records, canManage }: InvoiceRecordsPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [current, setCurrent] = useState<InvoiceRecordRow | null>(null);
  const [uploadTarget, setUploadTarget] = useState<InvoiceRecordRow | null>(null);
  const [attachmentRemark, setAttachmentRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const isEdit = useMemo(() => Boolean(current), [current]);

  function openCreate() {
    setCurrent(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(record: InvoiceRecordRow) {
    setCurrent(record);
    setForm({
      invoiceNo: record.invoiceNo,
      invoiceType: record.invoiceType,
      invoiceAmount: String(record.invoiceAmount),
      invoiceDate: toDateInputValue(record.invoiceDate),
      payerName: record.payerName || "",
      status: record.status
    });
    setOpen(true);
  }

  async function submitForm() {
    try {
      setIsSubmitting(true);
      const response = await fetch(
        current ? `/api/invoice-records/${current.id}` : `/api/contracts/${contractId}/invoice-records`,
        {
          method: current ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...form,
            invoiceAmount: Number(form.invoiceAmount)
          })
        }
      );
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "保存失败，请稍后重试"));
      }

      toast.success("保存成功", current ? "发票记录已更新" : "发票记录已新增");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("保存失败", error instanceof Error ? error.message : "保存失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(record: InvoiceRecordRow) {
    try {
      setDeletingId(record.id);
      const response = await fetch(`/api/invoice-records/${record.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "删除失败，请稍后重试"));
      }
      toast.success("删除成功", `发票 ${record.invoiceNo} 已删除`);
      router.refresh();
    } catch (error) {
      toast.error("删除失败", error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUploadAttachment() {
    const file = fileRef.current?.files?.[0] ?? null;
    if (!file || !uploadTarget) {
      toast.warning("请选择文件", "上传前需要先选择一个发票附件");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (attachmentRemark.trim()) {
        formData.append("remark", attachmentRemark.trim());
      }

      const response = await fetch(`/api/invoice-records/${uploadTarget.id}/attachment`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id: string }>;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "上传失败，请稍后重试"));
      }

      toast.success("上传成功", `发票 ${uploadTarget.invoiceNo} 已绑定附件`);
      setUploadOpen(false);
      setAttachmentRemark("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      toast.error("上传失败", error instanceof Error ? error.message : "上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SectionCard
      title="发票记录"
      description="基于开票记录维护发票台账，并绑定电子发票或扫描件。"
      actions={
        canManage ? (
          <Button type="button" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增发票
          </Button>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>发票号码</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>开票日期</TableHead>
              <TableHead>付款方</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>附件</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length ? (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.invoiceNo}</TableCell>
                  <TableCell>{invoiceTypeLabels[record.invoiceType as keyof typeof invoiceTypeLabels] ?? record.invoiceType}</TableCell>
                  <TableCell>{formatCurrency(record.invoiceAmount)}</TableCell>
                  <TableCell>{formatDate(record.invoiceDate)}</TableCell>
                  <TableCell>{record.payerName || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getInvoiceStatusBadgeVariant(record.status)}>
                      {invoiceStatusLabels[record.status as keyof typeof invoiceStatusLabels] ?? record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.attachment ? (
                      <Link href={record.attachment.fileUrl} className="inline-flex items-center gap-1 text-[rgb(45,83,164)] hover:text-foreground">
                        <ReceiptText className="h-4 w-4" />
                        {record.attachment.fileName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">未上传</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {record.attachment ? (
                        <Button asChild type="button" variant="outline" size="sm">
                          <Link href={record.attachment.fileUrl}>
                            <Download className="h-4 w-4" />
                            下载
                          </Link>
                        </Button>
                      ) : null}
                      {canManage ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadTarget(record);
                              setUploadOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4" />
                            {record.attachment ? "替换附件" : "上传附件"}
                          </Button>
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
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  暂无发票记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,640px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>{current ? "编辑发票记录" : "新增发票记录"}</DialogTitle>
            <DialogDescription>录入开票信息后，可继续绑定发票附件。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="invoice-no">发票号码</Label>
              <div className="mt-2">
                <Input
                  id="invoice-no"
                  value={form.invoiceNo}
                  onChange={(event) => setForm((value) => ({ ...value, invoiceNo: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-type">发票类型</Label>
              <div className="mt-2">
                <Select
                  value={form.invoiceType}
                  onValueChange={(value) => setForm((current) => ({ ...current, invoiceType: value }))}
                >
                  <SelectTrigger id="invoice-type">
                    <SelectValue placeholder="请选择发票类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-amount">开票金额</Label>
              <div className="mt-2">
                <Input
                  id="invoice-amount"
                  type="number"
                  value={form.invoiceAmount}
                  onChange={(event) => setForm((value) => ({ ...value, invoiceAmount: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-date">开票日期</Label>
              <div className="mt-2">
                <Input
                  id="invoice-date"
                  type="date"
                  value={form.invoiceDate}
                  onChange={(event) => setForm((value) => ({ ...value, invoiceDate: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="payer-name">付款方</Label>
              <div className="mt-2">
                <Input
                  id="payer-name"
                  value={form.payerName}
                  onChange={(event) => setForm((value) => ({ ...value, payerName: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-status">状态</Label>
              <div className="mt-2">
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger id="invoice-status">
                    <SelectValue placeholder="请选择发票状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-[min(92vw,560px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>上传发票附件</DialogTitle>
            <DialogDescription>
              {uploadTarget ? `为发票 ${uploadTarget.invoiceNo} 绑定电子发票或扫描件。` : "请选择附件。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="invoice-attachment-file">选择文件</Label>
              <div className="mt-2">
                <Input id="invoice-attachment-file" type="file" ref={fileRef} />
              </div>
            </div>
            <div>
              <Label htmlFor="invoice-attachment-remark">备注</Label>
              <div className="mt-2">
                <Input
                  id="invoice-attachment-remark"
                  value={attachmentRemark}
                  onChange={(event) => setAttachmentRemark(event.target.value)}
                  placeholder="可选，记录票据说明"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={isUploading}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleUploadAttachment()} disabled={isUploading}>
              {isUploading ? "上传中..." : "确认上传"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
