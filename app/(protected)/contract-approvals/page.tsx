import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { opportunityContractApprovalService } from "@/modules/opportunity-contract-approvals/service";

function getBadgeVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "default";
}

export default async function ContractApprovalsPage() {
  const user = await requirePagePermission(requireSessionUser(), "contractApproval", "view");
  const approvals = await opportunityContractApprovalService.list(user);

  return (
    <PageShell
      title="合同审批"
      description="集中查看合同申请的审批状态，并处理待审批事项。"
      breadcrumbs={[
        { label: "合同与资金" },
        { label: "合同审批" }
      ]}
    >
      <div className="surface-card-strong overflow-hidden rounded-[18px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>审批单</TableHead>
              <TableHead>商机</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>申请人</TableHead>
              <TableHead>审批人</TableHead>
              <TableHead>提交时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.length ? (
              approvals.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link href={`/contract-approvals/${item.id}`} className="text-[rgb(45,83,164)] hover:text-foreground">
                      {item.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {item.opportunity ? (
                      <Link href={`/opportunities/${item.opportunity.id}`} className="hover:text-[var(--color-primary)]">
                        {item.opportunity.code} / {item.opportunity.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(item.status)}>{item.statusLabel}</Badge>
                  </TableCell>
                  <TableCell>{item.applicantName}</TableCell>
                  <TableCell>{item.approverName}</TableCell>
                  <TableCell>{formatDateTime(item.submittedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  暂无审批数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  );
}
