import type { Opportunity } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const opportunityRepository = new BaseRepository<Opportunity>(prisma.opportunity as never);
