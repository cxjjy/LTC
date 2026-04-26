import { z } from "zod";

export const createOpportunityContractApprovalSchema = z.object({
  approvalComment: z.string().optional()
});

export const reviewOpportunityContractApprovalSchema = z.object({
  approvalComment: z.string().optional()
});
