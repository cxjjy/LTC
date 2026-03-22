import type { Customer } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const customerRepository = new BaseRepository<Customer>(prisma.customer as never);
