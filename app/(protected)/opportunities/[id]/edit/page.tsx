import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { requirePagePermission } from "@/lib/rbac";
import { customerService } from "@/modules/customers/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { opportunityService } from "@/modules/opportunities/service";
import { OpportunityForm } from "@/modules/opportunities/ui/form";
import { toDateInputValue } from "@/lib/utils";

export default async function EditOpportunityPage({ params }: { params: { id: string } }) {
  const user = await requirePagePermission(requireSessionUser(), "opportunity", "update");
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
          estimatedRevenue: decimalToNumber(opportunity.estimatedRevenue ?? opportunity.amount),
          estimatedLaborCost: decimalToNumber(opportunity.estimatedLaborCost),
          estimatedOutsourceCost: decimalToNumber(opportunity.estimatedOutsourceCost),
          estimatedProcurementCost: decimalToNumber(opportunity.estimatedProcurementCost),
          estimatedTravelCost: decimalToNumber(opportunity.estimatedTravelCost),
          estimatedOtherCost: decimalToNumber(opportunity.estimatedOtherCost),
          expectedSignDate: toDateInputValue(opportunity.expectedSignDate),
          winRate: opportunity.winRate,
          stage: opportunity.stage,
          description: opportunity.description || ""
        }}
      />
    </div>
  );
}
