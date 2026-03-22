import { PageHeader } from "@/components/page-header";
import { requireSessionUser } from "@/lib/auth";
import { contractService } from "@/modules/contracts/service";
import { decimalToNumber } from "@/modules/core/decimal";
import { receivableService } from "@/modules/receivables/service";
import { ReceivableForm } from "@/modules/receivables/ui/form";
import { toDateInputValue } from "@/lib/utils";

export default async function EditReceivablePage({ params }: { params: { id: string } }) {
  const user = await requireSessionUser();
  const receivable = (await receivableService.getDetail(params.id, user)) as any;
  const contractOptions = await contractService.getOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader title="编辑回款" description={`正在编辑 ${receivable.title}`} />
      <ReceivableForm
        mode="edit"
        receivableId={receivable.id}
        contractOptions={contractOptions}
        defaultValues={{
          contractId: receivable.contractId,
          title: receivable.title,
          amountDue: decimalToNumber(receivable.amountDue),
          dueDate: toDateInputValue(receivable.dueDate),
          description: receivable.description || ""
        }}
      />
    </div>
  );
}
