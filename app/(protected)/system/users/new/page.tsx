import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { roleService } from "@/modules/roles/service";
import { UserForm } from "@/modules/users/ui/form";

export default async function NewSystemUserPage() {
  const user = await requirePagePermission(requireSessionUser(), "user", "create");
  const roles = await roleService.getRoleOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="新增用户"
        description="创建系统用户并分配角色。"
        breadcrumbs={[
          { label: "系统管理" },
          { label: "用户管理", href: "/system/users" },
          { label: "新增用户" }
        ]}
        backHref="/system/users"
        backLabel="用户管理"
      />
      <UserForm mode="create" roles={roles} />
    </div>
  );
}
