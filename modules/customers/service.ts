import { EntityType, Prisma } from "@prisma/client";

import {
  createPaginationMeta,
  parseDateEnd,
  parseDateStart,
  type ListParams
} from "@/lib/pagination";
import { assertCanAccessRecord } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { generateBusinessCode } from "@/modules/core/code-generator.service";
import { auditLogService } from "@/modules/core/audit-log.service";
import { BaseCrudService } from "@/modules/core/base-crud-service";
import type { CreateCustomerDto, UpdateCustomerDto } from "@/modules/customers/dto";
import { customerRepository } from "@/modules/customers/repository";

class CustomerService extends BaseCrudService<unknown> {
  constructor() {
    super(customerRepository, "customer", EntityType.CUSTOMER);
  }

  protected override async assertCanSoftDelete(record: unknown) {
    const customer = record as { id: string };
    const [leadCount, opportunityCount, projectCount, contractCount, deliveryCount, costCount, receivableCount] =
      await Promise.all([
        prisma.lead.count({ where: { customerId: customer.id, isDeleted: false } }),
        prisma.opportunity.count({ where: { customerId: customer.id, isDeleted: false } }),
        prisma.project.count({ where: { customerId: customer.id, isDeleted: false } }),
        prisma.contract.count({ where: { customerId: customer.id, isDeleted: false } }),
        prisma.delivery.count({ where: { customerId: customer.id, isDeleted: false } }),
        prisma.cost.count({ where: { customerId: customer.id, isDeleted: false } }),
        prisma.receivable.count({ where: { customerId: customer.id, isDeleted: false } })
      ]);

    if (leadCount || opportunityCount || projectCount || contractCount || deliveryCount || costCount || receivableCount) {
      throw badRequest("当前客户存在关联业务数据，无法删除");
    }
  }

  async list(params: Required<ListParams>, user: SessionUser) {
    assertCanAccessRecord(user, "customer", "view");
    const filters = params.filters;
    const and: Prisma.CustomerWhereInput[] = [];

    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { name: { contains: params.keyword } },
          { contactName: { contains: params.keyword } }
        ]
      });
    }

    if (filters.name) {
      and.push({ name: { contains: filters.name } });
    }

    if (filters.industry) {
      and.push({ industry: { contains: filters.industry } });
    }

    if (filters.contactName) {
      and.push({ contactName: { contains: filters.contactName } });
    }

    const createdFrom = parseDateStart(filters.createdFrom);
    const createdTo = parseDateEnd(filters.createdTo);
    if (createdFrom || createdTo) {
      and.push({
        createdAt: {
          ...(createdFrom ? { gte: createdFrom } : {}),
          ...(createdTo ? { lte: createdTo } : {})
        }
      });
    }

    const where: Prisma.CustomerWhereInput = and.length ? { AND: and } : {};
    const orderByMap: Record<string, Prisma.CustomerOrderByWithRelationInput> = {
      createdAt: { createdAt: params.sortOrder },
      updatedAt: { updatedAt: params.sortOrder },
      name: { name: params.sortOrder },
      code: { code: params.sortOrder }
    };

    const total = await customerRepository.count(where);
    const items = await customerRepository.findMany({
      where,
      orderBy: orderByMap[params.sortBy] ?? { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    });

    return {
      items,
      ...createPaginationMeta(total, params.page, params.pageSize)
    };
  }

  async create(data: CreateCustomerDto, user: SessionUser) {
    assertCanAccessRecord(user, "customer", "create");

    const code = await generateBusinessCode(EntityType.CUSTOMER);
    const record = await customerRepository.create({
      ...data,
      code,
      createdBy: user.id,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.CUSTOMER,
      entityId: (record as { id: string }).id,
      entityCode: code,
      action: "CREATE",
      actorId: user.id,
      message: "创建客户"
    });

    return record;
  }

  async update(id: string, data: UpdateCustomerDto, user: SessionUser) {
    assertCanAccessRecord(user, "customer", "update");

    const existing = await customerRepository.findById(id);
    if (!existing) {
      throw notFound();
    }

    const record = await customerRepository.update(id, {
      ...data,
      updatedBy: user.id
    });

    await auditLogService.log({
      entityType: EntityType.CUSTOMER,
      entityId: id,
      entityCode: (record as { code: string }).code,
      action: "UPDATE",
      actorId: user.id,
      message: "更新客户"
    });

    return record;
  }

  async getDetail(id: string, user: SessionUser) {
    assertCanAccessRecord(user, "customer", "view");
    const record = await customerRepository.findById(id, {
      leads: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      },
      opportunities: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      },
      projects: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      },
      contracts: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      }
    });

    if (!record) {
      throw notFound();
    }

    return record;
  }

  async getOptions(user: SessionUser) {
    assertCanAccessRecord(user, "customer", "view");
    const items = await customerRepository.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return items.map((item) => ({
      label: `${(item as { code: string }).code} / ${(item as { name: string }).name}`,
      value: (item as { id: string }).id
    }));
  }
}

export const customerService = new CustomerService();
