import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { customerService } from "@/modules/customers/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { opportunityService } from "@/modules/opportunities/service";
import { OpportunityForm } from "@/modules/opportunities/ui/form";
import { toDateInputValue } from "@/lib/utils";

export default async function EditOpportunityPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const opportunity = (await opportunityService.getDetail(params.id, user)) as any;
  const customerOptions = await customerService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑商机" description={`正在编辑 ${opportunity.name}`} />
      <OpportunityForm
        mode="edit"
        opportunityId={opportunity.id}
        customerOptions={customerOptions}
        defaultValues={{
          customerId: opportunity.customerId,
          name: opportunity.name,
          amount: decimalToNumber(opportunity.amount),
          expectedSignDate: toDateInputValue(opportunity.expectedSignDate),
          winRate: opportunity.winRate,
          stage: opportunity.stage,
          description: opportunity.description || ""
        }}
      />
    </div>
  );
}
