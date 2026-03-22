import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { customerService } from "@/modules/customers/service";
import { CustomerForm } from "@/modules/customers/ui/form";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const customer = (await customerService.getDetail(params.id, user)) as any;

  return (
    <div className="space-y-6">
      <PageHeader title="编辑客户" description={`正在编辑 ${customer.name}`} />
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          industry: customer.industry || "",
          contactName: customer.contactName || "",
          contactPhone: customer.contactPhone || "",
          address: customer.address || "",
          remark: customer.remark || ""
        }}
      />
    </div>
  );
}
