import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { projectService } from "@/modules/projects/service";
import { DeliveryForm } from "@/modules/deliveries/ui/form";

export default async function NewDeliveryPage() {
  const user = await requirePagePermission(requireSessionUser(), "delivery", "create");
  const projectOptions = await projectService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="新建交付" description="记录项目中的关键交付节点" />
      <DeliveryForm mode="create" projectOptions={projectOptions} defaultValues={{}} />
    </div>
  );
}
