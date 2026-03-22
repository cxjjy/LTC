import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { customerService } from "@/modules/customers/service";
import { LeadForm } from "@/modules/leads/ui/form";
import { decimalToNumber } from "@/modules/core/decimal";
import { leadService } from "@/modules/leads/service";
import { toDateInputValue } from "@/lib/utils";

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const lead = (await leadService.getDetail(params.id, user)) as any;
  const customerOptions = await customerService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑线索" description={`正在编辑 ${lead.title}`} />
      <LeadForm
        mode="edit"
        leadId={lead.id}
        customerOptions={customerOptions}
        defaultValues={{
          customerId: lead.customerId,
          title: lead.title,
          source: lead.source || "",
          contactName: lead.contactName || "",
          contactPhone: lead.contactPhone || "",
          expectedAmount: decimalToNumber(lead.expectedAmount),
          expectedCloseDate: toDateInputValue(lead.expectedCloseDate),
          latestFollowUpAt: toDateInputValue(lead.latestFollowUpAt),
          description: lead.description || "",
          status: lead.status
        }}
      />
    </div>
  );
}
