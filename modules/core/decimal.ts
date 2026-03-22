import { Prisma } from "@prisma/client";

export function toDecimal(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return new Prisma.Decimal(value);
}

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export function sumDecimalValues(values: Array<Prisma.Decimal | number | null | undefined>) {
  return values.reduce<number>((total, current) => total + decimalToNumber(current), 0);
}
