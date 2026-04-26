"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Paperclip, Plus, Trash2, Upload } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";
import { formatDateTime } from "@/lib/utils";

type AttachmentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType?: string | null;
  uploadedBy: string;
  uploadedAt: string | Date;
  remark?: string | null;
  status?: string;
};

type BizAttachmentManagerProps = {
  title: string;
  description?: string;
  uploadLabel?: string;
  emptyLabel: string;
  bizType: string;
  bizId: string;
  projectId?: string;
  uploadUrl: string;
  attachments: AttachmentItem[];
  canManage: boolean;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function BizAttachmentManager({
  title,
  description,
  uploadLabel = "上传资料",
  emptyLabel,
  bizType,
  bizId,
  projectId,
  uploadUrl,
  attachments,
  canManage
}: BizAttachmentManagerProps) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0] ?? null;
    if (!file) {
      toast.warning("请选择文件", "上传前需要先选择一个资料文件");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bizType", bizType);
      formData.append("bizId", bizId);
      if (projectId) {
        formData.append("projectId", projectId);
      }
      if (remark.trim()) {
        formData.append("remark", remark.trim());
      }

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "上传失败，请稍后重试"));
      }

      toast.success("上传成功", `${title}已更新`);
      setOpen(false);
      setRemark("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      toast.error("上传失败", error instanceof Error ? error.message : "上传失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, fileName: string) {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/biz-attachments/${id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "删除失败，请稍后重试"));
      }

      toast.success("删除成功", `${fileName} 已移除`);
      router.refresh();
    } catch (error) {
      toast.error("删除失败", error instanceof Error ? error.message : "删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        canManage ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {uploadLabel}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {attachments.length ? (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-col gap-3 rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{attachment.fileName}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)} · {attachment.mimeType || "未知类型"} · 上传人 {attachment.uploadedBy} ·{" "}
                  {formatDateTime(attachment.uploadedAt)}
                </div>
                {attachment.remark ? (
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">备注：{attachment.remark}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={attachment.fileUrl}>
                    <Download className="h-4 w-4" />
                    下载
                  </Link>
                </Button>
                {canManage ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === attachment.id}
                    onClick={() => void handleDelete(attachment.id, attachment.fileName)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === attachment.id ? "删除中" : "删除"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,560px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>上传{title}</DialogTitle>
            <DialogDescription>上传后即可在当前页面查看、下载和删除。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor={`${bizType}-file`}>选择文件</Label>
              <div className="mt-2">
                <Input id={`${bizType}-file`} type="file" ref={fileRef} />
              </div>
            </div>
            <div>
              <Label htmlFor={`${bizType}-remark`}>备注</Label>
              <div className="mt-2">
                <Input
                  id={`${bizType}-remark`}
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="可选，填写资料说明"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="button" onClick={() => void handleUpload()} disabled={isSubmitting}>
              <Upload className="h-4 w-4" />
              {isSubmitting ? "上传中..." : "确认上传"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
