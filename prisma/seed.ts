import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";

import {
  defaultRolePermissionCodes,
  permissionDefinitions,
  ROLE_CODES,
  roleLabelMap,
  type RoleCode
} from "../lib/permissions";
import { prisma } from "../lib/prisma";

const roleCodeToLegacyRole: Record<RoleCode, UserRole> = {
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  SALES: UserRole.SALES,
  PROJECT_MANAGER: UserRole.PROJECT_MANAGER,
  FINANCE: UserRole.FINANCE,
  DELIVERY: UserRole.DELIVERY,
  VIEWER: UserRole.VIEWER
};

function code(prefix: string, year: number, index: number) {
  return `${prefix}-${year}${String(index).padStart(4, "0")}`;
}

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.auditLog.deleteMany();
  await prisma.authBinding.deleteMany();
  await prisma.rolePermissionAssignment.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.receivable.deleteMany();
  await prisma.cost.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.project.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.codeSequence.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  await prisma.permission.createMany({
    data: permissionDefinitions.map((item) => ({
      code: item.code,
      name: item.name,
      module: item.module,
      action: item.action,
      description: item.description
    }))
  });

  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      code: true
    }
  });
  const permissionIdMap = new Map(permissions.map((item) => [item.code, item.id]));

  const roles = await Promise.all(
    (Object.values(ROLE_CODES) as RoleCode[]).map((roleCode) =>
      prisma.role.create({
        data: {
          code: roleCode,
          name: roleLabelMap[roleCode],
          description: `${roleLabelMap[roleCode]}默认系统角色`,
          isSystem: true,
          rolePermissions: {
            create: (defaultRolePermissionCodes[roleCode] ?? []).map((permissionCode) => {
              const permissionId = permissionIdMap.get(permissionCode);

              if (!permissionId) {
                throw new Error(`权限不存在：${permissionCode}`);
              }

              return { permissionId };
            })
          }
        }
      })
    )
  );
  const roleIdMap = new Map(roles.map((role) => [role.code, role.id]));

  const users = await Promise.all(
    [
      {
        username: "admin",
        name: "系统管理员",
        email: "admin@ltc.local",
        phone: "13800000000",
        roleCode: ROLE_CODES.SUPER_ADMIN
      },
      {
        username: "sales",
        name: "销售演示账号",
        email: "sales@ltc.local",
        phone: "13800000011",
        roleCode: ROLE_CODES.SALES
      },
      {
        username: "pm",
        name: "项目经理演示账号",
        email: "pm@ltc.local",
        phone: "13800000012",
        roleCode: ROLE_CODES.PROJECT_MANAGER
      },
      {
        username: "delivery",
        name: "交付演示账号",
        email: "delivery@ltc.local",
        phone: "13800000013",
        roleCode: ROLE_CODES.DELIVERY
      },
      {
        username: "finance",
        name: "财务演示账号",
        email: "finance@ltc.local",
        phone: "13800000014",
        roleCode: ROLE_CODES.FINANCE
      },
      {
        username: "viewer",
        name: "只读演示账号",
        email: "viewer@ltc.local",
        phone: "13800000015",
        roleCode: ROLE_CODES.VIEWER
      }
    ].map((item) =>
      prisma.user.create({
        data: {
          username: item.username,
          displayName: item.name,
          name: item.name,
          email: item.email,
          phone: item.phone,
          passwordHash,
          role: roleCodeToLegacyRole[item.roleCode],
          userRoles: {
            create: {
              roleId: roleIdMap.get(item.roleCode)!
            }
          }
        }
      })
    )
  );

  const admin = users[0];

  const customer = await prisma.customer.create({
    data: {
      code: code("CUST", year, 1),
      name: "华星制造集团",
      industry: "制造业",
      contactName: "李总",
      contactPhone: "13800000001",
      address: "上海市浦东新区示例路 88 号",
      remark: "种子客户，用于演示 LTC 闭环",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const lead = await prisma.lead.create({
    data: {
      code: code("LEAD", year, 1),
      customerId: customer.id,
      title: "华东工厂数字化升级线索",
      source: "渠道推荐",
      contactName: "李总",
      contactPhone: "13800000001",
      expectedAmount: new Prisma.Decimal(120000),
      expectedCloseDate: new Date(year, 4, 20),
      latestFollowUpAt: now,
      description: "涉及 MES、设备联网与数据大屏需求",
      status: "CONVERTED",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const opportunity = await prisma.opportunity.create({
    data: {
      code: code("OPP", year, 1),
      customerId: customer.id,
      leadId: lead.id,
      name: "华星制造数字化升级商机",
      description: "已完成方案交流并进入成交阶段",
      amount: new Prisma.Decimal(120000),
      estimatedRevenue: new Prisma.Decimal(120000),
      estimatedLaborCost: new Prisma.Decimal(18000),
      estimatedOutsourceCost: new Prisma.Decimal(12000),
      estimatedProcurementCost: new Prisma.Decimal(15000),
      estimatedTravelCost: new Prisma.Decimal(3000),
      estimatedOtherCost: new Prisma.Decimal(2000),
      estimatedTotalCost: new Prisma.Decimal(50000),
      estimatedProfit: new Prisma.Decimal(70000),
      estimatedProfitMargin: new Prisma.Decimal(0.5833),
      expectedSignDate: new Date(year, 5, 1),
      winRate: 80,
      stage: "WON",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const project = await prisma.project.create({
    data: {
      code: code("PROJ", year, 1),
      customerId: customer.id,
      opportunityId: opportunity.id,
      name: "华星制造数字化升级项目",
      description: "一期覆盖生产看板、设备采集和报工流程",
      budgetAmount: new Prisma.Decimal(100000),
      plannedStartDate: new Date(year, 5, 5),
      plannedEndDate: new Date(year, 8, 30),
      status: "IN_PROGRESS",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const contract = await prisma.contract.create({
    data: {
      code: code("CONT", year, 1),
      customerId: customer.id,
      projectId: project.id,
      name: "华星制造一期实施合同",
      contractAmount: new Prisma.Decimal(120000),
      signedDate: new Date(year, 5, 2),
      effectiveDate: new Date(year, 5, 3),
      endDate: new Date(year, 11, 31),
      status: "EFFECTIVE",
      description: "一期实施与运维服务",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const delivery = await prisma.delivery.create({
    data: {
      code: code("DELI", year, 1),
      customerId: customer.id,
      projectId: project.id,
      title: "一期蓝图与需求确认",
      description: "完成现场调研与蓝图评审",
      ownerName: "王工",
      plannedDate: new Date(year, 5, 10),
      actualDate: new Date(year, 5, 12),
      acceptanceDate: new Date(year, 5, 13),
      status: "ACCEPTED",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const cost = await prisma.cost.create({
    data: {
      code: code("COST", year, 1),
      customerId: customer.id,
      projectId: project.id,
      title: "实施人工成本",
      category: "LABOR",
      amount: new Prisma.Decimal(30000),
      occurredAt: new Date(year, 5, 15),
      description: "顾问与开发工时投入",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  const receivable = await prisma.receivable.create({
    data: {
      code: code("REC", year, 1),
      customerId: customer.id,
      projectId: project.id,
      contractId: contract.id,
      title: "一期首付款",
      amountDue: new Prisma.Decimal(50000),
      amountReceived: new Prisma.Decimal(50000),
      dueDate: new Date(year, now.getMonth(), 10),
      receivedDate: new Date(year, now.getMonth(), 12),
      status: "RECEIVED",
      description: "合同首付款已到账",
      createdBy: admin.id,
      updatedBy: admin.id
    }
  });

  await prisma.codeSequence.createMany({
    data: [
      { entityType: "CUSTOMER", prefix: "CUST", year, currentValue: 1 },
      { entityType: "LEAD", prefix: "LEAD", year, currentValue: 1 },
      { entityType: "OPPORTUNITY", prefix: "OPP", year, currentValue: 1 },
      { entityType: "PROJECT", prefix: "PROJ", year, currentValue: 1 },
      { entityType: "CONTRACT", prefix: "CONT", year, currentValue: 1 },
      { entityType: "DELIVERY", prefix: "DELI", year, currentValue: 1 },
      { entityType: "COST", prefix: "COST", year, currentValue: 1 },
      { entityType: "RECEIVABLE", prefix: "REC", year, currentValue: 1 }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        entityType: "LEAD",
        entityId: lead.id,
        entityCode: lead.code,
        action: "CONVERT",
        message: "线索转换为商机",
        actorId: admin.id,
        payload: { opportunityId: opportunity.id }
      },
      {
        entityType: "OPPORTUNITY",
        entityId: opportunity.id,
        entityCode: opportunity.code,
        action: "CONVERT",
        message: "商机转换为项目",
        actorId: admin.id,
        payload: { projectId: project.id }
      },
      {
        entityType: "PROJECT",
        entityId: project.id,
        entityCode: project.code,
        action: "STATUS_CHANGE",
        message: "项目状态变更为 IN_PROGRESS",
        actorId: admin.id,
        payload: { to: "IN_PROGRESS" }
      },
      {
        entityType: "CONTRACT",
        entityId: contract.id,
        entityCode: contract.code,
        action: "STATUS_CHANGE",
        message: "合同状态变更为 EFFECTIVE",
        actorId: admin.id,
        payload: { to: "EFFECTIVE" }
      },
      {
        entityType: "RECEIVABLE",
        entityId: receivable.id,
        entityCode: receivable.code,
        action: "UPDATE",
        message: "维护回款到账信息",
        actorId: admin.id,
        payload: { amountReceived: 50000 }
      },
      {
        entityType: "DELIVERY",
        entityId: delivery.id,
        entityCode: delivery.code,
        action: "CREATE",
        message: "创建交付记录",
        actorId: admin.id,
        payload: { projectId: project.id }
      },
      {
        entityType: "COST",
        entityId: cost.id,
        entityCode: cost.code,
        action: "CREATE",
        message: "创建成本记录",
        actorId: admin.id,
        payload: { projectId: project.id }
      }
    ]
  });

  console.log("Seed completed.");
  console.log("Default accounts: admin / sales / pm / delivery / finance / viewer");
  console.log("Default password: 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
