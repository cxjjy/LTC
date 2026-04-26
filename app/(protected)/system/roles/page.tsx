import Link from "next/link";

import { DeleteAction } from "@/components/delete-action";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSessionUser } from "@/lib/auth";
import { canAccessRecord, requirePagePermission } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { roleService } from "@/modules/roles/service";

export default async function SystemRolesPage() {
  const user = await requirePagePermission(requireSessionUser(), "role", "view");
  const roles = await roleService.list(user);

  return (
    <PageShell
      title="角色管理"
      description="管理角色信息，并按模块分配功能权限。"
      breadcrumbs={[
        { label: "系统管理" },
        { label: "角色管理" }
      ]}
      headerAction={canAccessRecord(user, "role", "create") ? (
        <Button asChild>
          <Link href="/system/roles/new">新增角色</Link>
        </Button>
      ) : null}
    >
      <div className="surface-card-strong overflow-hidden rounded-[18px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>角色名称</TableHead>
              <TableHead>角色编码</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>用户数</TableHead>
              <TableHead>系统角色</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.code}</TableCell>
                <TableCell>{item.description || "-"}</TableCell>
                <TableCell>{item._count.userRoles}</TableCell>
                <TableCell>{item.isSystem ? "是" : "否"}</TableCell>
                <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canAccessRecord(user, "role", "update") ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/system/roles/${item.id}/edit`}>编辑权限</Link>
                      </Button>
                    ) : null}
                    {!item.isSystem && canAccessRecord(user, "role", "delete") ? (
                      <DeleteAction
                        moduleLabel="角色"
                        recordLabel={`${item.code} / ${item.name}`}
                        endpoint={`/api/system/roles/${item.id}`}
                        warning="删除角色后，该角色将不再可分配，请确认是否继续。"
                        redirectTo="/system/roles"
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
