import type { ContractStatus } from "@prisma/client";

export const CONTRACT_STATUS_ACTIVE = "ACTIVE" as ContractStatus;
export const CONTRACT_STATUS_TERMINATED = "TERMINATED" as ContractStatus;

export const CONTRACT_STATUSES_COUNTABLE_ON_PROJECT: ContractStatus[] = [
  CONTRACT_STATUS_ACTIVE
];
