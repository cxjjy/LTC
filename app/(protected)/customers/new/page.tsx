import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { CustomerForm } from "@/modules/customers/ui/form";

export default async function NewCustomerPage() {
  await requireSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader title="新建客户" description="创建客户主数据" />
      <CustomerForm mode="create" defaultValues={{}} />
    </div>
  );
}
