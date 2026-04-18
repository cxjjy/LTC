import Link from "next/link";

import { DeleteAction } from "@/components/delete-action";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSessionUser } from "@/lib/auth";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { userManagementService } from "@/modules/users/service";
import { UserStatusButton, ResetPasswordButton } from "@/modules/users/ui/actions";

export default async function SystemUsersPage() {
  const user = await requirePagePermission(requireSessionUser(), "user", "view");
  const records = await userManagementService.list(user);

  return (
    <PageShell
      title="用户管理"
      description="管理系统用户、账号状态和角色分配。"
      breadcrumbs={[
        { label: "系统管理" },
        { label: "用户管理" }
      ]}
      headerAction={canAccessRecord(user, "user", "create") ? (
        <Button asChild>
          <Link href="/system/users/new">新增用户</Link>
        </Button>
      ) : null}
    >
      <div className="surface-card-strong overflow-hidden rounded-[18px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{item.displayName}</div>
                  <div className="text-xs text-muted-foreground">{item.username}</div>
                </TableCell>
                <TableCell>{item.email || "-"}</TableCell>
                <TableCell>{item.phone || "-"}</TableCell>
                <TableCell>{item.isActive ? "启用" : "禁用"}</TableCell>
                <TableCell>{userManagementService.formatRoleSummary(item as any)}</TableCell>
                <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canAccessRecord(user, "user", "update") ? (
                      <>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/system/users/${item.id}/edit`}>编辑</Link>
                        </Button>
                        <UserStatusButton userId={item.id} isActive={item.isActive} />
                        <ResetPasswordButton userId={item.id} />
                      </>
                    ) : null}
                    {canAccessRecord(user, "user", "delete") ? (
                      <DeleteAction
                        moduleLabel="用户"
                        recordLabel={`${item.displayName} / ${item.username}`}
                        endpoint={`/api/system/users/${item.id}`}
                        warning="删除用户后将无法继续登录系统，请确认是否继续。"
                        redirectTo="/system/users"
                      />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  );
}
