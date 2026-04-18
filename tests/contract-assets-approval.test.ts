import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  bizAttachment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  invoiceRecord: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn()
  },
  paymentRecord: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  opportunityContractApproval: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  contract: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  project: {
    findFirst: vi.fn()
  },
  opportunity: {
    findFirst: vi.fn(),
    update: vi.fn()
  },
  user: {
    findMany: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  }
}));

const mockFs = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn()
}));

const mockAuditLog = vi.hoisted(() => vi.fn());
const mockGenerateBusinessCode = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("fs", () => ({
  promises: mockFs
}));

vi.mock("@/modules/core/audit-log.service", () => ({
  auditLogService: {
    log: mockAuditLog
  }
}));

vi.mock("@/modules/core/code-generator.service", () => ({
  generateBusinessCode: mockGenerateBusinessCode
}));

function createSessionUser(role: string, extra: Partial<Record<"permissions", string[]>> = {}) {
  return {
    id: `${role.toLowerCase()}-1`,
    username: role.toLowerCase(),
    name: role,
    role,
    roleName: role,
    roles: [],
    permissions: extra.permissions ?? []
  };
}

describe("contract assets and approval module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports uploading contract attachments into unified biz_attachments", async () => {
    const { bizAttachmentService } = await import("@/modules/biz-attachments/service");
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      name: "测试合同",
      projectId: "project-1"
    });
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "project-1",
      code: "PROJ-1",
      name: "测试项目"
    });
    mockPrisma.bizAttachment.create.mockResolvedValue({
      id: "attachment-1",
      bizType: "contract",
      bizId: "contract-1",
      projectId: "project-1",
      contractId: "contract-1",
      fileName: "contract.pdf",
      fileUrl: "/uploads/biz/contract/project-1/contract.pdf",
      filePath: "/tmp/contract.pdf",
      fileSize: 5,
      mimeType: "application/pdf",
      uploadedBy: "FINANCE",
      uploadedAt: new Date("2026-04-18T10:00:00.000Z"),
      remark: "初版",
      status: "active"
    });

    const result = await bizAttachmentService.upload(
      {
        bizType: "contract",
        bizId: "contract-1",
        projectId: "project-1",
        contractId: "contract-1",
        remark: "初版",
        file: new File(["hello"], "contract.pdf", { type: "application/pdf" })
      },
      createSessionUser("FINANCE")
    );

    expect(mockFs.writeFile).toHaveBeenCalled();
    expect(mockPrisma.bizAttachment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bizType: "contract",
          contractId: "contract-1",
          projectId: "project-1"
        })
      })
    );
    expect(result.fileName).toBe("contract.pdf");
  });

  it("creates invoice records and binds uploaded invoice attachments", async () => {
    const { invoiceRecordService } = await import("@/modules/invoice-records/service");
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      projectId: "project-1",
      name: "测试合同"
    });
    mockPrisma.invoiceRecord.create.mockResolvedValue({
      id: "invoice-1",
      contractId: "contract-1",
      projectId: "project-1",
      invoiceNo: "INV-001"
    });

    const created = await invoiceRecordService.create(
      "contract-1",
      {
        invoiceNo: "INV-001",
        invoiceType: "special",
        invoiceAmount: 1000,
        invoiceDate: new Date("2026-04-18"),
        payerName: "甲方",
        status: "issued"
      },
      createSessionUser("FINANCE")
    );

    expect(created).toMatchObject({ id: "invoice-1" });
    expect(mockPrisma.invoiceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: "contract-1",
          projectId: "project-1"
        })
      })
    );

    mockPrisma.invoiceRecord.findFirst.mockResolvedValue({
      id: "invoice-1",
      contractId: "contract-1",
      projectId: "project-1",
      attachmentId: null
    });
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "project-1",
      code: "PROJ-1",
      name: "测试项目"
    });
    mockPrisma.bizAttachment.create.mockResolvedValue({
      id: "attachment-1",
      bizType: "invoice",
      bizId: "invoice-1",
      projectId: "project-1",
      contractId: "contract-1",
      fileName: "invoice.pdf",
      fileUrl: "/uploads/biz/invoice/project-1/invoice.pdf",
      filePath: "/tmp/invoice.pdf",
      fileSize: 5,
      mimeType: "application/pdf",
      uploadedBy: "FINANCE",
      uploadedAt: new Date("2026-04-18T10:00:00.000Z"),
      remark: "电子票",
      status: "active"
    });

    await invoiceRecordService.uploadAttachment(
      "invoice-1",
      new File(["invoice"], "invoice.pdf", { type: "application/pdf" }),
      "电子票",
      createSessionUser("FINANCE")
    );

    expect(mockPrisma.invoiceRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1" },
        data: expect.objectContaining({ attachmentId: "attachment-1" })
      })
    );
  });

  it("creates manual payment records and marks source_type as manual", async () => {
    const { paymentRecordService } = await import("@/modules/payment-records/service");
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      projectId: "project-1"
    });
    mockPrisma.paymentRecord.create.mockResolvedValue({
      id: "payment-1",
      contractId: "contract-1",
      sourceType: "manual"
    });

    const result = await paymentRecordService.create(
      "contract-1",
      {
        paymentAmount: 2000,
        paymentDate: new Date("2026-04-18"),
        paymentMethod: "bank_transfer",
        payerName: "甲方",
        remark: "首付款到账"
      },
      createSessionUser("FINANCE")
    );

    expect(result).toMatchObject({ id: "payment-1" });
    expect(mockPrisma.paymentRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "manual"
        })
      })
    );
  });

  it("supports approval-driven contract creation and back-links the approval", async () => {
    const { contractService } = await import("@/modules/contracts/service");
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "project-1",
      customerId: "customer-1",
      opportunityId: "opp-1",
      isDeleted: false
    });
    mockPrisma.opportunityContractApproval.findFirst
      .mockResolvedValueOnce({
        id: "approval-1",
        opportunityId: "opp-1",
        status: "approved",
        createdContractId: null
      })
      .mockResolvedValueOnce(null);
    mockGenerateBusinessCode.mockResolvedValue("CON-20260001");
    mockPrisma.contract.create.mockResolvedValue({
      id: "contract-1",
      code: "CON-20260001",
      projectId: "project-1",
      customerId: "customer-1",
      status: "DRAFT"
    });

    const created = await contractService.create(
      {
        projectId: "project-1",
        name: "测试合同",
        contractAmount: 10000,
        signedDate: undefined,
        effectiveDate: undefined,
        endDate: undefined,
        status: "DRAFT",
        description: "由审批生成"
      },
      createSessionUser("SUPER_ADMIN"),
      { approvalId: "approval-1" }
    );

    expect(created).toMatchObject({ id: "contract-1", code: "CON-20260001" });
    expect(mockPrisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "CON-20260001",
          customerId: "customer-1",
          projectId: "project-1"
        })
      })
    );
    expect(mockPrisma.opportunityContractApproval.update).toHaveBeenCalledWith({
      where: { id: "approval-1" },
      data: {
        createdContractId: "contract-1"
      }
    });
  });

  it("submits opportunity-to-contract approvals with snapshot and approver assignment", async () => {
    const { opportunityContractApprovalService } = await import("@/modules/opportunity-contract-approvals/service");
    mockPrisma.opportunity.findFirst
      .mockResolvedValueOnce({
        id: "opp-1",
        code: "OPP-1",
        customerId: "customer-1",
        customer: { name: "测试客户" },
        lead: null,
        name: "测试商机",
        amount: 10000,
        estimatedRevenue: 10000,
        description: "需要转合同",
        expectedSignDate: new Date("2026-04-20"),
        stage: "NEGOTIATION",
        projects: [{ id: "project-1", code: "PROJ-1", name: "项目A", status: "INITIATING" }]
      })
      .mockResolvedValueOnce(null);
    mockPrisma.opportunityContractApproval.findFirst.mockResolvedValue(null);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "finance-1",
        username: "finance",
        displayName: "财务审批人",
        name: "财务审批人"
      }
    ]);
    mockPrisma.opportunityContractApproval.create.mockResolvedValue({
      id: "approval-1",
      opportunityId: "opp-1",
      applicantId: "sales-1",
      approverId: "finance-1",
      status: "pending",
      approvalComment: "请审批",
      submittedAt: new Date("2026-04-18T10:00:00.000Z"),
      approvedAt: null,
      rejectedAt: null,
      createdContractId: null,
      snapshotJson: { foo: "bar" }
    });

    const result = await opportunityContractApprovalService.create(
      "opp-1",
      {
        approvalComment: "请审批"
      },
      createSessionUser("SALES")
    );

    expect(mockPrisma.opportunityContractApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approverId: "finance-1"
        })
      })
    );
    expect(result.approverName).toBe("财务审批人");
  });

  it("allows approver to approve or reject, but blocks non-approvers", async () => {
    const { opportunityContractApprovalService } = await import("@/modules/opportunity-contract-approvals/service");
    mockPrisma.opportunityContractApproval.findFirst.mockResolvedValue({
      id: "approval-1",
      opportunityId: "opp-1",
      approverId: "finance-1",
      status: "pending",
      approvalComment: null
    });

    await expect(
      opportunityContractApprovalService.approve(
        "approval-1",
        { approvalComment: "同意" },
        createSessionUser("SALES")
      )
    ).rejects.toThrow("当前账号无权审批转合同申请");

    mockPrisma.opportunityContractApproval.update.mockResolvedValue({
      id: "approval-1",
      status: "approved"
    });
    mockPrisma.opportunity.findFirst.mockResolvedValue({
      id: "opp-1",
      code: "OPP-1",
      stage: "NEGOTIATION"
    });
    mockPrisma.opportunity.update.mockResolvedValue({});

    const approved = await opportunityContractApprovalService.approve(
      "approval-1",
      { approvalComment: "同意" },
      createSessionUser("FINANCE")
    );
    expect(approved).toMatchObject({ status: "approved" });

    mockPrisma.opportunityContractApproval.findFirst.mockResolvedValue({
      id: "approval-2",
      opportunityId: "opp-2",
      approverId: "finance-1",
      status: "pending",
      approvalComment: null
    });
    mockPrisma.opportunityContractApproval.update.mockResolvedValue({
      id: "approval-2",
      status: "rejected"
    });
    mockPrisma.opportunity.findFirst.mockResolvedValue({
      id: "opp-2",
      code: "OPP-2"
    });

    const rejected = await opportunityContractApprovalService.reject(
      "approval-2",
      { approvalComment: "资料不完整" },
      createSessionUser("FINANCE")
    );
    expect(rejected).toMatchObject({ status: "rejected" });
  });

  it("lists invoice records with attachment payloads and supports update/delete flows", async () => {
    const { invoiceRecordService } = await import("@/modules/invoice-records/service");
    const financeUser = createSessionUser("FINANCE");

    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      projectId: "project-1",
      name: "测试合同"
    });
    mockPrisma.invoiceRecord.findMany.mockResolvedValue([
      {
        id: "invoice-1",
        contractId: "contract-1",
        projectId: "project-1",
        invoiceNo: "INV-001",
        invoiceType: "special",
        invoiceAmount: 1000,
        invoiceDate: new Date("2026-04-18"),
        payerName: "甲方",
        status: "issued",
        createdBy: "finance-1",
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        updatedAt: new Date("2026-04-18T10:00:00.000Z"),
        attachmentId: "attachment-1"
      }
    ]);
    mockPrisma.bizAttachment.findMany.mockResolvedValue([
      {
        id: "attachment-1",
        fileName: "invoice.pdf",
        remark: "电子票",
        status: "active",
        uploadedAt: new Date("2026-04-18T11:00:00.000Z"),
        uploadedBy: "财务"
      }
    ]);

    const listed = await invoiceRecordService.listByContract("contract-1", financeUser);
    expect(listed[0]?.attachment).toMatchObject({
      id: "attachment-1",
      fileName: "invoice.pdf",
      fileUrl: "/api/biz-attachments/attachment-1/download"
    });

    mockPrisma.invoiceRecord.findFirst.mockResolvedValueOnce({
      id: "invoice-1",
      contractId: "contract-1",
      invoiceNo: "INV-001",
      status: "issued"
    });
    mockPrisma.invoiceRecord.update.mockResolvedValue({
      id: "invoice-1",
      invoiceNo: "INV-001A"
    });

    await invoiceRecordService.update(
      "invoice-1",
      {
        invoiceNo: "INV-001A",
        invoiceType: "normal",
        invoiceAmount: 1200,
        invoiceDate: new Date("2026-04-19"),
        payerName: "甲方更新",
        status: "voided"
      },
      financeUser
    );

    expect(mockPrisma.invoiceRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1" },
        data: expect.objectContaining({
          invoiceType: "normal",
          status: "voided"
        })
      })
    );

    mockPrisma.invoiceRecord.findFirst.mockResolvedValueOnce({
      id: "invoice-1",
      contractId: "contract-1",
      invoiceNo: "INV-001A",
      attachmentId: "attachment-1"
    });
    mockPrisma.bizAttachment.findFirst.mockResolvedValue({
      id: "attachment-1",
      bizType: "invoice",
      contractId: "contract-1",
      projectId: "project-1",
      fileName: "invoice.pdf",
      filePath: "/tmp/invoice.pdf"
    });
    mockPrisma.invoiceRecord.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.bizAttachment.delete.mockResolvedValue({});
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      projectId: "project-1",
      name: "测试合同"
    });
    mockPrisma.invoiceRecord.delete.mockResolvedValue({});

    const deleted = await invoiceRecordService.delete("invoice-1", financeUser);
    expect(deleted).toMatchObject({ success: true });
    expect(mockPrisma.invoiceRecord.updateMany).toHaveBeenCalledWith({
      where: { attachmentId: "attachment-1" },
      data: {
        attachmentId: null
      }
    });
    expect(mockPrisma.invoiceRecord.delete).toHaveBeenCalledWith({
      where: { id: "invoice-1" }
    });
  });

  it("supports payment record list/update/delete and blocks synced records from manual maintenance", async () => {
    const { paymentRecordService } = await import("@/modules/payment-records/service");
    const financeUser = createSessionUser("FINANCE");

    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      projectId: "project-1"
    });
    mockPrisma.paymentRecord.findMany.mockResolvedValue([
      {
        id: "payment-1",
        contractId: "contract-1",
        paymentAmount: 2000,
        paymentDate: new Date("2026-04-18"),
        sourceType: "manual"
      }
    ]);

    const listed = await paymentRecordService.listByContract("contract-1", financeUser);
    expect(listed).toHaveLength(1);

    mockPrisma.paymentRecord.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      contractId: "contract-1",
      sourceType: "manual"
    });
    mockPrisma.paymentRecord.update.mockResolvedValue({
      id: "payment-1",
      paymentAmount: 2500
    });

    await paymentRecordService.update(
      "payment-1",
      {
        paymentAmount: 2500,
        paymentDate: new Date("2026-04-19"),
        paymentMethod: "bank_transfer",
        payerName: "甲方更新",
        remark: "更新到账"
      },
      financeUser
    );

    expect(mockPrisma.paymentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment-1" },
        data: expect.objectContaining({
          payerName: "甲方更新"
        })
      })
    );

    mockPrisma.paymentRecord.findFirst.mockResolvedValueOnce({
      id: "payment-sync-1",
      contractId: "contract-1",
      sourceType: "finance_sync"
    });
    await expect(
      paymentRecordService.update(
        "payment-sync-1",
        {
          paymentAmount: 2600,
          paymentDate: new Date("2026-04-20"),
          paymentMethod: "bank_transfer",
          payerName: "甲方",
          remark: "不可编辑"
        },
        financeUser
      )
    ).rejects.toThrow("财务同步记录暂不支持手动编辑");

    mockPrisma.paymentRecord.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      contractId: "contract-1",
      sourceType: "manual"
    });
    mockPrisma.paymentRecord.delete.mockResolvedValue({});

    const deleted = await paymentRecordService.delete("payment-1", financeUser);
    expect(deleted).toMatchObject({ success: true });
    expect(mockPrisma.paymentRecord.delete).toHaveBeenCalledWith({
      where: { id: "payment-1" }
    });
  });

  it("supports listing and maintaining contract business attachments across tabs", async () => {
    const { bizAttachmentService } = await import("@/modules/biz-attachments/service");
    const financeUser = createSessionUser("FINANCE");

    mockPrisma.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      code: "CON-1",
      name: "测试合同",
      projectId: "project-1"
    });
    mockPrisma.bizAttachment.findMany.mockResolvedValue([
      {
        id: "attachment-contract-1",
        bizType: "contract",
        bizId: "contract-1",
        contractId: "contract-1",
        projectId: "project-1",
        fileName: "contract-v1.pdf",
        fileUrl: "/uploads/biz/contract/contract-1/contract-v1.pdf",
        filePath: "/tmp/contract-v1.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedBy: "财务",
        uploadedAt: new Date("2026-04-18T10:00:00.000Z"),
        remark: "合同电子版",
        status: "active"
      }
    ]);

    const attachments = await bizAttachmentService.listByContract("contract-1", "contract", financeUser);
    expect(attachments[0]).toMatchObject({
      id: "attachment-contract-1",
      bizType: "contract",
      fileUrl: "/api/biz-attachments/attachment-contract-1/download"
    });

    mockPrisma.bizAttachment.findFirst.mockResolvedValue({
      id: "attachment-contract-1",
      bizType: "contract",
      contractId: "contract-1",
      projectId: "project-1",
      fileName: "contract-v1.pdf",
      filePath: "/tmp/contract-v1.pdf",
      status: "active"
    });
    mockPrisma.bizAttachment.update.mockResolvedValue({
      id: "attachment-contract-1",
      bizType: "contract",
      bizId: "contract-1",
      contractId: "contract-1",
      projectId: "project-1",
      fileName: "contract-v1.pdf",
      fileUrl: "/uploads/biz/contract/contract-1/contract-v1.pdf",
      filePath: "/tmp/contract-v1.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      uploadedBy: "财务",
      uploadedAt: new Date("2026-04-18T10:00:00.000Z"),
      remark: "归档版本",
      status: "archived"
    });

    const updatedMeta = await bizAttachmentService.updateMeta(
      "attachment-contract-1",
      { remark: "归档版本", status: "archived" },
      financeUser
    );
    expect(updatedMeta).toMatchObject({
      remark: "归档版本",
      status: "archived"
    });
  });

  it("gates contract creation until approval is approved", async () => {
    const { contractService } = await import("@/modules/contracts/service");
    mockPrisma.project.findFirst.mockResolvedValue({
      id: "project-1",
      customerId: "customer-1",
      opportunityId: "opp-1"
    });
    mockPrisma.opportunityContractApproval.findFirst.mockResolvedValue(null);

    await expect(
      contractService.create(
        {
          projectId: "project-1",
          name: "测试合同",
          contractAmount: 10000,
          signedDate: undefined,
          effectiveDate: undefined,
          endDate: undefined,
          status: "DRAFT",
          description: ""
        },
        createSessionUser("SUPER_ADMIN"),
        { approvalId: "approval-1" }
      )
    ).rejects.toThrow("当前商机尚未通过转合同审批，不能创建合同");
  });

  it("rejects attachment upload for users without permission", async () => {
    const { bizAttachmentService } = await import("@/modules/biz-attachments/service");

    await expect(
      bizAttachmentService.upload(
        {
          bizType: "contract",
          bizId: "contract-1",
          contractId: "contract-1",
          projectId: "project-1",
          file: new File(["hello"], "contract.pdf", { type: "application/pdf" })
        },
        createSessionUser("VIEWER")
      )
    ).rejects.toThrow("当前账号无权管理该类资料");
  });
});
