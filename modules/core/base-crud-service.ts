import type { EntityType } from "@prisma/client";

import { assertCanAccessRecord, type ResourceName } from "@/lib/rbac";
import { notFound } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import { auditLogService } from "@/modules/core/audit-log.service";

type Repository<T> = {
  findById(id: string, include?: Record<string, unknown>): Promise<T | null>;
  findMany(args: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  count(where?: Record<string, unknown>): Promise<number>;
  softDelete(id: string, userId: string): Promise<T>;
};

export abstract class BaseCrudService<T> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly resourceName: ResourceName,
    protected readonly entityType: EntityType
  ) {}

  async getById(id: string, user: SessionUser, include?: Record<string, unknown>) {
    assertCanAccessRecord(user, this.resourceName, "view");
    const record = await this.repository.findById(id, include);
    if (!record) {
      throw notFound();
    }
    return record;
  }

  async softDelete(id: string, user: SessionUser) {
    assertCanAccessRecord(user, this.resourceName, "delete");
    const record = await this.repository.findById(id);

    if (!record) {
      throw notFound();
    }

    const deleted = await this.repository.softDelete(id, user.id);
    await auditLogService.log({
      entityType: this.entityType,
      entityId: id,
      action: "SOFT_DELETE",
      actorId: user.id,
      message: "软删除记录"
    });
    return deleted;
  }
}
