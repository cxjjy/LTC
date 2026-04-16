CREATE TABLE `auth_bindings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `providerUserId` VARCHAR(191) NOT NULL,
    `unionId` VARCHAR(191) NULL,
    `openId` VARCHAR(191) NULL,
    `nick` VARCHAR(100) NULL,
    `avatar` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_bindings_provider_providerUserId_key`(`provider`, `providerUserId`),
    INDEX `auth_bindings_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `auth_bindings`
    ADD CONSTRAINT `auth_bindings_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
