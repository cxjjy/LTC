import type { ContractStatus, ProjectStatus } from "@prisma/client";

import { badRequest } from "@/lib/errors";

const projectTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  INITIATING: ["IN_PROGRESS", "PAUSED", "CANCELED"],
  IN_PROGRESS: ["PAUSED", "COMPLETED", "CANCELED"],
  PAUSED: ["IN_PROGRESS", "CANCELED"],
  COMPLETED: [],
  CANCELED: []
};

const contractTransitions: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ["APPROVING", "TERMINATED"],
  APPROVING: ["EFFECTIVE", "TERMINATED", "DRAFT"],
  EFFECTIVE: ["TERMINATED"],
  TERMINATED: []
};

export function assertProjectStatusTransition(from: ProjectStatus, to: ProjectStatus) {
  if (from === to) {
    return;
  }

  if (!projectTransitions[from].includes(to)) {
    throw badRequest(`项目状态不允许从 ${from} 变更为 ${to}`);
  }
}

export function assertContractStatusTransition(from: ContractStatus, to: ContractStatus) {
  if (from === to) {
    return;
  }

  if (!contractTransitions[from].includes(to)) {
    throw badRequest(`合同状态不允许从 ${from} 变更为 ${to}`);
  }
}
