import type { EntityType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const prefixMap: Record<EntityType, string> = {
  USER: "USER",
  CUSTOMER: "CUST",
  LEAD: "LEAD",
  OPPORTUNITY: "OPP",
  PROJECT: "PROJ",
  CONTRACT: "CONT",
  DELIVERY: "DELI",
  COST: "COST",
  RECEIVABLE: "REC",
  AUDIT_LOG: "AUD"
};

export async function generateBusinessCode(entityType: EntityType, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const year = new Date().getFullYear();
  const prefix = prefixMap[entityType];

  const existing = await client.codeSequence.findUnique({
    where: {
      entityType_year: {
        entityType,
        year
      }
    }
  });

  const currentValue = (existing?.currentValue ?? 0) + 1;

  if (existing) {
    await client.codeSequence.update({
      where: { id: existing.id },
      data: { currentValue }
    });
  } else {
    await client.codeSequence.create({
      data: {
        entityType,
        prefix,
        year,
        currentValue
      }
    });
  }

  return `${prefix}-${year}${String(currentValue).padStart(4, "0")}`;
}
