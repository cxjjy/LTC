import type { AuditLog } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const auditLogRepository = new BaseRepository<AuditLog>(prisma.auditLog as never, {
  softDelete: false
});
