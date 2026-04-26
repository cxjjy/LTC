import { prisma } from "@/lib/prisma";
import { generateUniqueReadableUsername, normalizeDisplayName } from "@/lib/user-identity";

async function main() {
  const bindings = await prisma.authBinding.findMany({
    where: { provider: "dingtalk" },
    select: {
      userId: true,
      providerUserId: true
    }
  });
  const dingUserIdMap = new Map(bindings.map((item) => [item.userId, item.providerUserId]));

  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      OR: [
        { username: { startsWith: "dd_" } },
        { dingUserId: null, authBindings: { some: { provider: "dingtalk" } } },
        { displayName: "" }
      ]
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      name: true,
      dingUserId: true
    }
  });

  let updatedCount = 0;

  for (const user of users) {
    const displayName = normalizeDisplayName(user.displayName || user.name || user.username);
    const nextUsername = user.username.startsWith("dd_")
      ? await generateUniqueReadableUsername(displayName, {
          excludeUserId: user.id,
          forceRandomSuffix: true
        })
      : user.username;
    const nextDingUserId = user.dingUserId || dingUserIdMap.get(user.id) || null;

    const shouldUpdate =
      user.displayName !== displayName ||
      user.name !== displayName ||
      user.username !== nextUsername ||
      user.dingUserId !== nextDingUserId;

    if (!shouldUpdate) {
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        name: displayName,
        username: nextUsername,
        dingUserId: nextDingUserId
      }
    });

    updatedCount += 1;
    console.info(`updated ${user.id}: ${user.username} -> ${nextUsername}`);
  }

  console.info(`backfill completed, updated ${updatedCount} user(s)`);
}

main()
  .catch((error) => {
    console.error("backfill failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
