import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { roleService } from "@/modules/roles/service";
import { userManagementService } from "@/modules/users/service";
import { UserForm } from "@/modules/users/ui/form";

export default async function EditSystemUserPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "user", "update");
  const [record, roles] = await Promise.all([
    userManagementService.getById(params.id, user),
    roleService.getRoleOptions(user)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="编辑用户"
        description={`正在维护 ${record.displayName} 的账号信息。`}
        breadcrumbs={[
          { label: "系统管理" },
          { label: "用户管理", href: "/system/users" },
          { label: record.displayName }
        ]}
        backHref="/system/users"
        backLabel="用户管理"
      />
      <UserForm
        mode="edit"
        userId={record.id}
        roles={roles}
        defaultValues={{
          username: record.username,
          displayName: record.displayName,
          email: record.email || "",
          phone: record.phone || "",
          isActive: record.isActive,
          roleIds: record.userRoles.map((item) => item.roleId)
        }}
      />
    </div>
  );
}
