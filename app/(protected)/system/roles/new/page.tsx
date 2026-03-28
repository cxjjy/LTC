import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { RoleForm } from "@/modules/roles/ui/form";

export default async function NewSystemRolePage() {
  await requirePagePermission(requireSessionUser(), "role", "create");

  return (
    <div className="space-y-6">
      <PageHeader
        title="新增角色"
        description="创建自定义角色，并按模块分配权限。"
        breadcrumbs={[
          { label: "系统管理" },
          { label: "角色管理", href: "/system/roles" },
          { label: "新增角色" }
        ]}
        backHref="/system/roles"
        backLabel="角色管理"
      />
      <RoleForm mode="create" />
    </div>
  );
}
