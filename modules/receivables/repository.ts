import type { Receivable } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const receivableRepository = new BaseRepository<Receivable>(prisma.receivable as never);
