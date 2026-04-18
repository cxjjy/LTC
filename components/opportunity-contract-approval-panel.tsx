"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, FileText, Plus, Send, XCircle } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";
import { approvalStatusLabels } from "@/lib/constants";
import { getUserFriendlyError, type ApiErrorPayload, type ApiSuccessPayload } from "@/lib/ui-error";
import { formatDateTime } from "@/lib/utils";

type ApprovalSummary = {
  id: string;
  status: string;
  statusLabel?: string;
  approvalComment?: string | null;
  applicantName?: string;
  approverName?: string;
  submittedAt: string | Date;
  approvedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  createdContractId?: string | null;
};

type OpportunityContractApprovalPanelProps = {
  opportunityId: string;
  latestApproval: ApprovalSummary | null;
  defaultProjectId?: string;
  canApply: boolean;
  canReview: boolean;
  canCreateContract: boolean;
  canAutoCreateContract: boolean;
};

function getBadgeVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "default";
}

export function OpportunityContractApprovalPanel({
  opportunityId,
  latestApproval,
  defaultProjectId,
  canApply,
  canReview,
  canCreateContract,
  canAutoCreateContract
}: OpportunityContractApprovalPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [comment, setComment] = useState("");
  const [actionOpen, setActionOpen] = useState<null | "apply" | "approve" | "reject">(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);

  async function submitAction() {
    const action = actionOpen;
    if (!action) {
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint =
        action === "apply"
          ? `/api/opportunities/${opportunityId}/contract-approvals`
          : `/api/contract-approvals/${latestApproval?.id}/${action}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          approvalComment: comment
        })
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "处理失败，请稍后重试"));
      }
      toast.success(
        action === "apply" ? "申请已提交" : action === "approve" ? "审批已通过" : "审批已驳回",
        action === "apply" ? "已提交转合同审批申请，等待审批人处理" : undefined
      );
      setActionOpen(null);
      setComment("");
      router.refresh();
    } catch (error) {
      toast.error("处理失败", error instanceof Error ? error.message : "处理失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createContractDraft() {
    if (!latestApproval) {
      return;
    }

    try {
      setIsCreatingContract(true);
      const response = await fetch(`/api/contract-approvals/${latestApproval.id}/create-contract`, {
        method: "POST"
      });
      const payload = (await response.json()) as ApiErrorPayload | ApiSuccessPayload<{ id: string }>;
      if (!response.ok || !payload.success) {
        throw new Error(getUserFriendlyError(payload, "生成合同草稿失败，请稍后重试"));
      }

      const contractId = (payload as ApiSuccessPayload<{ id: string }>).data?.id;
      toast.success("生成成功", "合同草稿已创建");
      router.push(contractId ? `/contracts/${contractId}` : "/contracts");
      router.refresh();
    } catch (error) {
      toast.error("生成失败", error instanceof Error ? error.message : "生成失败，请稍后重试");
    } finally {
      setIsCreatingContract(false);
    }
  }

  return (
    <SectionCard
      title="转合同审批"
      description="商机进入合同创建前需要先完成审批，通过后才能进入合同创建流程或自动生成合同草稿。"
      actions={
        <div className="flex flex-wrap gap-2">
          {canApply && (!latestApproval || latestApproval.status !== "pending") ? (
            <Button type="button" variant="outline" onClick={() => setActionOpen("apply")}>
              <Plus className="h-4 w-4" />
              申请转合同
            </Button>
          ) : null}
          {latestApproval?.status === "approved" && canCreateContract ? (
            <Button asChild type="button" variant="outline">
              <Link
                href={`/contracts/new?approvalId=${latestApproval.id}${defaultProjectId ? `&projectId=${defaultProjectId}` : ""}`}
              >
                <FileText className="h-4 w-4" />
                进入合同创建
              </Link>
            </Button>
          ) : null}
          {latestApproval?.status === "approved" &&
          !latestApproval.createdContractId &&
          canAutoCreateContract ? (
            <Button type="button" onClick={() => void createContractDraft()} disabled={isCreatingContract}>
              <Send className="h-4 w-4" />
              {isCreatingContract ? "生成中..." : "自动生成合同草稿"}
            </Button>
          ) : null}
        </div>
      }
    >
      {latestApproval ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getBadgeVariant(latestApproval.status)}>
              {latestApproval.statusLabel ||
                approvalStatusLabels[latestApproval.status as keyof typeof approvalStatusLabels] ||
                latestApproval.status}
            </Badge>
            <Link href={`/contract-approvals/${latestApproval.id}`} className="text-sm text-[rgb(45,83,164)] hover:text-foreground">
              查看审批详情
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem label="申请人" value={latestApproval.applicantName || "-"} />
            <InfoItem label="审批人" value={latestApproval.approverName || "-"} />
            <InfoItem label="提交时间" value={formatDateTime(latestApproval.submittedAt)} />
            <InfoItem
              label="处理时间"
              value={formatDateTime(latestApproval.approvedAt || latestApproval.rejectedAt || null)}
            />
          </div>
          {latestApproval.approvalComment ? (
            <div className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3 text-sm text-muted-foreground">
              审批意见：{latestApproval.approvalComment}
            </div>
          ) : null}
          {latestApproval.status === "pending" && canReview ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setActionOpen("approve")}>
                <CheckCircle2 className="h-4 w-4" />
                通过
              </Button>
              <Button type="button" variant="destructive" onClick={() => setActionOpen("reject")}>
                <XCircle className="h-4 w-4" />
                驳回
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          当前商机尚未发起转合同审批。
        </div>
      )}

      <Dialog open={Boolean(actionOpen)} onOpenChange={(open) => (!open ? setActionOpen(null) : undefined)}>
        <DialogContent className="w-[min(92vw,560px)] rounded-[18px]">
          <DialogHeader>
            <DialogTitle>
              {actionOpen === "apply"
                ? "提交转合同审批"
                : actionOpen === "approve"
                  ? "审批通过"
                  : "驳回申请"}
            </DialogTitle>
            <DialogDescription>
              {actionOpen === "apply"
                ? "提交后将自动流转给审批人，审批通过后方可创建合同。"
                : "请填写审批意见，便于后续留痕和追踪。"}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="approval-comment">审批意见</Label>
            <div className="mt-2">
              <Input
                id="approval-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="可选，填写审批说明"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setActionOpen(null)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              type="button"
              variant={actionOpen === "reject" ? "destructive" : "default"}
              onClick={() => void submitAction()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "提交中..." : actionOpen === "approve" ? "确认通过" : actionOpen === "reject" ? "确认驳回" : "确认提交"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border bg-[var(--color-background)] px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  );
}
