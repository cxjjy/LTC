import type { Project } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BaseRepository } from "@/modules/core/base-repository";

export const projectRepository = new BaseRepository<Project>(prisma.project as never);
