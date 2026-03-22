import type { Cost } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const costRepository = new BaseRepository<Cost>(prisma.cost as never);
