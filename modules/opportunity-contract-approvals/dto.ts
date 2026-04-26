import type { z } from "zod";

import type {
  createOpportunityContractApprovalSchema,
  reviewOpportunityContractApprovalSchema
} from "@/modules/opportunity-contract-approvals/validation";

export type CreateOpportunityContractApprovalDto = z.infer<typeof createOpportunityContractApprovalSchema>;
export type ReviewOpportunityContractApprovalDto = z.infer<typeof reviewOpportunityContractApprovalSchema>;
