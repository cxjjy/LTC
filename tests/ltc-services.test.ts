import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContractStatus, OpportunityStage } from "@prisma/client";

const mockPrisma = vi.hoisted(() => ({
  lead: {
    findFirst: vi.fn()
  },
  opportunity: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  project: {
    create: vi.fn(),
    findFirst: vi.fn()
  },
  contract: {
    findFirst: vi.fn()
  },
  receivable: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  $transaction: vi.fn()
}));

const mockGenerateBusinessCode = vi.hoisted(() => vi.fn());
const mockAuditLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/modules/core/code-generator.service", () => ({
  generateBusinessCode: mockGenerateBusinessCode
}));

vi.mock("@/modules/core/audit-log.service", () => ({
  auditLogService: {
    log: mockAuditLog
  }
}));

describe("LTC 核心服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("线索可以通过事务转换为商机", async () => {
    const { leadService } = await import("@/modules/leads/service");
    const tx = {
      lead: {
        findFirst: vi.fn().mockResolvedValue({
          id: "lead-1",
          code: "LEAD-20260001",
          customerId: "customer-1",
          status: "FOLLOWING"
        }),
        update: vi.fn().mockResolvedValue({})
      },
      opportunity: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "opp-1",
          code: "OPP-20260001"
        })
      }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    mockGenerateBusinessCode.mockResolvedValue("OPP-20260001");

    const result = await leadService.convertLeadToOpportunity(
      "lead-1",
      { name: "测试商机", amount: 8000, description: "test" },
      { id: "sales-1", username: "sales", name: "销售", role: "SALES" }
    );

    expect(tx.opportunity.create).toHaveBeenCalled();
    expect(tx.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CONVERTED" })
      })
    );
    expect(result).toMatchObject({ id: "opp-1", code: "OPP-20260001" });
  });

  it("商机可以通过事务转换为项目，并自动推动商机至 WON", async () => {
    const { opportunityService } = await import("@/modules/opportunities/service");
    const tx = {
      opportunity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "opp-1",
          code: "OPP-20260001",
          customerId: "customer-1",
          stage: OpportunityStage.DISCOVERY
        }),
        update: vi.fn().mockResolvedValue({})
      },
      project: {
        create: vi.fn().mockResolvedValue({
          id: "project-1",
          code: "PROJ-20260001"
        })
      }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    mockGenerateBusinessCode.mockResolvedValue("PROJ-20260001");

    const result = await opportunityService.convertOpportunityToProject(
      "opp-1",
      { name: "测试项目" },
      { id: "sales-1", username: "sales", name: "销售", role: "SALES" }
    );

    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          opportunityId: "opp-1",
          customerId: "customer-1"
        })
      })
    );
    expect(tx.opportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stage: OpportunityStage.WON })
      })
    );
    expect(result).toMatchObject({ id: "project-1" });
  });

  it("只有合同生效后才能创建回款", async () => {
    const { receivableService } = await import("@/modules/receivables/service");
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      customerId: "customer-1",
      projectId: "project-1",
      status: ContractStatus.EFFECTIVE
    });
    mockPrisma.receivable.create.mockResolvedValue({
      id: "rec-1",
      code: "REC-20260001"
    });
    mockGenerateBusinessCode.mockResolvedValue("REC-20260001");

    const result = await receivableService.create(
      {
        contractId: "contract-1",
        title: "首付款",
        amountDue: 10000,
        dueDate: new Date("2026-03-31"),
        description: "测试"
      },
      { id: "finance-1", username: "finance", name: "财务", role: "FINANCE" }
    );

    expect(mockPrisma.receivable.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: "contract-1",
          customerId: "customer-1",
          projectId: "project-1"
        })
      })
    );
    expect(result).toMatchObject({ id: "rec-1" });
  });

  it("项目毛利按已生效合同金额减去成本金额计算", async () => {
    const { projectService } = await import("@/modules/projects/service");
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "project-1",
      contracts: [{ contractAmount: 120000 }, { contractAmount: 30000 }],
      costs: [{ amount: 50000 }, { amount: 10000 }]
    });

    const result = await projectService.calculateGrossProfit("project-1");

    expect(result).toEqual({
      effectiveContractAmount: 150000,
      totalCostAmount: 60000,
      estimatedGrossProfit: 90000
    });
  });
});
