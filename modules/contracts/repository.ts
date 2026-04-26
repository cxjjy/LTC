import type { Contract } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const contractRepository = new BaseRepository<Contract>(prisma.contract as never);
