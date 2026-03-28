"use client";

import { useRef, useState } from "react";
import { Download, Paperclip, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

import { DeleteAction } from "@/components/delete-action";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getUserFriendlyError, type ApiErrorPayload } from "@/lib/ui-error";

type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string | Date;
  uploadedBy: string;
};

type ContractAttachmentsProps = {
  contractId: string;
  attachments: Attachment[];
  canManage: boolean;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function ContractAttachments({
  contractId,
  attachments,
  canManage
}: ContractAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleUpload(file: File | null) {
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/contracts/${contractId}/attachments`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "附件上传失败，请稍后重试"));
      }

      toast.success("上传成功", "合同附件已更新");
      router.refresh();
    } catch (error) {
      toast.error("上传失败", error instanceof Error ? error.message : "附件上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <SectionCard
      title="合同附件"
      description="保留合同原始文件，支持上传、下载与删除。"
      actions={
        canManage ? (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "上传中" : "上传附件"}
            </Button>
          </>
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
                  {formatFileSize(attachment.fileSize)} · {attachment.fileType || "未知类型"} · 上传人 {attachment.uploadedBy} ·{" "}
                  {new Date(attachment.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={attachment.fileUrl} download={attachment.fileName}>
                    <Download className="h-4 w-4" />
                    下载
                  </a>
                </Button>
                {canManage ? (
                  <DeleteAction
                    moduleLabel="合同附件"
                    recordLabel={attachment.fileName}
                    endpoint={`/api/attachments/${attachment.id}`}
                    warning="删除附件后，该合同将不再保留对应原始文件。若当前合同已生效，至少需要保留一个附件。"
                    variant="button"
                    onDeleted={() => router.refresh()}
                  />
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            当前合同还没有上传附件。
          </div>
        )}
      </div>
    </SectionCard>
  );
}
