import { randomInt } from "node:crypto";

import { pinyin } from "pinyin-pro";

import { prisma } from "@/lib/prisma";

const USERNAME_MAX_LENGTH = 100;
const RANDOM_SUFFIX_MIN = 100;
const RANDOM_SUFFIX_MAX = 9999;

function sanitizeUsernamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

export function normalizeDisplayName(value: string | null | undefined) {
  return value?.trim() || "钉钉用户";
}

export function buildReadableUsernameBase(displayName: string) {
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const transliterated = pinyin(normalizedDisplayName, {
    toneType: "none",
    type: "string",
    separator: "",
    mode: "surname",
    surname: "head",
    nonZh: "consecutive",
    v: true
  });
  const base = sanitizeUsernamePart(transliterated) || sanitizeUsernamePart(normalizedDisplayName);

  if (base) {
    return /^[a-z]/.test(base) ? base : `user${base}`.slice(0, USERNAME_MAX_LENGTH);
  }

  return `user${Date.now().toString().slice(-6)}`;
}

type GenerateUsernameOptions = {
  excludeUserId?: string;
  forceRandomSuffix?: boolean;
};

export async function generateUniqueReadableUsername(displayName: string, options: GenerateUsernameOptions = {}) {
  const base = buildReadableUsernameBase(displayName);
  const whereBase = {
    username: base,
    isDeleted: false,
    ...(options.excludeUserId ? { NOT: { id: options.excludeUserId } } : {})
  };

  if (!options.forceRandomSuffix) {
    const existingBase = await prisma.user.findFirst({ where: whereBase, select: { id: true } });
    if (!existingBase) {
      return base;
    }
  }

  while (true) {
    const suffix = String(randomInt(RANDOM_SUFFIX_MIN, RANDOM_SUFFIX_MAX + 1));
    const candidate = `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const existing = await prisma.user.findFirst({
      where: {
        username: candidate,
        isDeleted: false,
        ...(options.excludeUserId ? { NOT: { id: options.excludeUserId } } : {})
      },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }
  }
}
