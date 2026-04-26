import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { deliveryService } from "@/modules/deliveries/service";
import { DeliveryForm } from "@/modules/deliveries/ui/form";
import { projectService } from "@/modules/projects/service";
import { toDateInputValue } from "@/lib/utils";

export default async function EditDeliveryPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "delivery", "update");
  const delivery = (await deliveryService.getDetail(params.id, user)) as any;
  const projectOptions = await projectService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑交付" description={`正在编辑 ${delivery.title}`} />
      <DeliveryForm
        mode="edit"
        deliveryId={delivery.id}
        projectOptions={projectOptions}
        defaultValues={{
          projectId: delivery.projectId,
          title: delivery.title,
          ownerName: delivery.ownerName || "",
          plannedDate: toDateInputValue(delivery.plannedDate),
          actualDate: toDateInputValue(delivery.actualDate),
          acceptanceDate: toDateInputValue(delivery.acceptanceDate),
          status: delivery.status,
          description: delivery.description || ""
        }}
      />
    </div>
  );
}
