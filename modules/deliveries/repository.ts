import type { Delivery } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const deliveryRepository = new BaseRepository<Delivery>(prisma.delivery as never);
