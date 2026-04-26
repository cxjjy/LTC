import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { roleService } from "@/modules/roles/service";
import { RoleForm } from "@/modules/roles/ui/form";

export default async function EditSystemRolePage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "role", "update");
  const role = await roleService.getById(params.id, user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="编辑角色"
        description={`正在维护 ${role.name} 的权限分配。`}
        breadcrumbs={[
          { label: "系统管理" },
          { label: "角色管理", href: "/system/roles" },
          { label: role.code }
        ]}
        backHref="/system/roles"
        backLabel="角色管理"
      />
      <RoleForm
        mode="edit"
        roleId={role.id}
        defaultValues={{
          code: role.code,
          name: role.name,
          description: role.description || "",
          permissionCodes: role.rolePermissions.map((item) => item.permission.code)
        }}
      />
    </div>
  );
}
