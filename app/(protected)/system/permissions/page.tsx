import { PageShell } from "@/components/page-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSessionUser } from "@/lib/auth";
import { permissionModuleLabels } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/rbac";
import { permissionService } from "@/modules/permissions/service";

export default async function SystemPermissionsPage() {
  const user = await requirePagePermission(requireSessionUser(), "permission", "view");
  const permissions = await permissionService.list(user);

  return (
    <PageShell
      title="权限查看"
      description="只读查看系统权限字典，便于角色配置和权限排查。"
      breadcrumbs={[
        { label: "系统管理" },
        { label: "权限查看" }
      ]}
    >
      <div className="surface-card-strong overflow-hidden rounded-[18px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>权限名称</TableHead>
              <TableHead>权限编码</TableHead>
              <TableHead>所属模块</TableHead>
              <TableHead>动作</TableHead>
              <TableHead>说明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.code}</TableCell>
                <TableCell>{permissionModuleLabels[item.module as keyof typeof permissionModuleLabels] ?? item.module}</TableCell>
                <TableCell>{item.action}</TableCell>
                <TableCell>{item.description || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  );
}
