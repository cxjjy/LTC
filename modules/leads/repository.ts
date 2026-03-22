import type { Lead } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const leadRepository = new BaseRepository<Lead>(prisma.lead as never);
