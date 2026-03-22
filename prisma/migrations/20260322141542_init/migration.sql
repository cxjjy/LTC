-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'SALES', 'PM', 'DELIVERY', 'FINANCE') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `industry` VARCHAR(100) NULL,
    `contactName` VARCHAR(100) NULL,
    `contactPhone` VARCHAR(50) NULL,
    `address` VARCHAR(255) NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Customer_code_key`(`code`),
    INDEX `Customer_name_isDeleted_idx`(`name`, `isDeleted`),
    INDEX `Customer_isDeleted_createdAt_idx`(`isDeleted`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `source` VARCHAR(100) NULL,
    `contactName` VARCHAR(100) NULL,
    `contactPhone` VARCHAR(50) NULL,
    `expectedAmount` DECIMAL(18, 2) NULL,
    `expectedCloseDate` DATETIME(3) NULL,
    `latestFollowUpAt` DATETIME(3) NULL,
    `description` TEXT NULL,
    `status` ENUM('NEW', 'FOLLOWING', 'CONVERTED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Lead_code_key`(`code`),
    INDEX `Lead_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Lead_status_isDeleted_idx`(`status`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Opportunity` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `expectedSignDate` DATETIME(3) NULL,
    `winRate` INTEGER NOT NULL DEFAULT 0,
    `stage` ENUM('DISCOVERY', 'REQUIREMENT', 'PROPOSAL', 'QUOTATION', 'NEGOTIATION', 'WON', 'LOST') NOT NULL DEFAULT 'DISCOVERY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Opportunity_code_key`(`code`),
    UNIQUE INDEX `Opportunity_leadId_key`(`leadId`),
    INDEX `Opportunity_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Opportunity_stage_isDeleted_idx`(`stage`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `budgetAmount` DECIMAL(18, 2) NULL,
    `plannedStartDate` DATETIME(3) NULL,
    `plannedEndDate` DATETIME(3) NULL,
    `status` ENUM('INITIATING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'INITIATING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Project_code_key`(`code`),
    INDEX `Project_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Project_opportunityId_isDeleted_idx`(`opportunityId`, `isDeleted`),
    INDEX `Project_status_isDeleted_idx`(`status`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contract` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `contractAmount` DECIMAL(18, 2) NOT NULL,
    `signedDate` DATETIME(3) NULL,
    `effectiveDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'APPROVING', 'EFFECTIVE', 'TERMINATED') NOT NULL DEFAULT 'DRAFT',
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Contract_code_key`(`code`),
    INDEX `Contract_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Contract_projectId_isDeleted_idx`(`projectId`, `isDeleted`),
    INDEX `Contract_status_isDeleted_idx`(`status`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delivery` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `ownerName` VARCHAR(100) NULL,
    `plannedDate` DATETIME(3) NULL,
    `actualDate` DATETIME(3) NULL,
    `acceptanceDate` DATETIME(3) NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'ACCEPTED', 'DELAYED', 'CANCELED') NOT NULL DEFAULT 'NOT_STARTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Delivery_code_key`(`code`),
    INDEX `Delivery_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Delivery_projectId_isDeleted_idx`(`projectId`, `isDeleted`),
    INDEX `Delivery_status_isDeleted_idx`(`status`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cost` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `category` ENUM('PROCUREMENT', 'LABOR', 'TRAVEL', 'OUTSOURCING', 'OTHER') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Cost_code_key`(`code`),
    INDEX `Cost_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Cost_projectId_isDeleted_idx`(`projectId`, `isDeleted`),
    INDEX `Cost_category_isDeleted_idx`(`category`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receivable` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `amountDue` DECIMAL(18, 2) NOT NULL,
    `amountReceived` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NOT NULL,
    `receivedDate` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'RECEIVED', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Receivable_code_key`(`code`),
    INDEX `Receivable_customerId_isDeleted_idx`(`customerId`, `isDeleted`),
    INDEX `Receivable_projectId_isDeleted_idx`(`projectId`, `isDeleted`),
    INDEX `Receivable_contractId_isDeleted_idx`(`contractId`, `isDeleted`),
    INDEX `Receivable_status_isDeleted_idx`(`status`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('USER', 'CUSTOMER', 'LEAD', 'OPPORTUNITY', 'PROJECT', 'CONTRACT', 'DELIVERY', 'COST', 'RECEIVABLE', 'AUDIT_LOG') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `entityCode` VARCHAR(40) NULL,
    `action` ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'STATUS_CHANGE', 'CONVERT', 'LOGIN') NOT NULL,
    `message` VARCHAR(255) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CodeSequence` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('USER', 'CUSTOMER', 'LEAD', 'OPPORTUNITY', 'PROJECT', 'CONTRACT', 'DELIVERY', 'COST', 'RECEIVABLE', 'AUDIT_LOG') NOT NULL,
    `prefix` VARCHAR(20) NOT NULL,
    `year` INTEGER NOT NULL,
    `currentValue` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CodeSequence_entityType_year_key`(`entityType`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_opportunityId_fkey` FOREIGN KEY (`opportunityId`) REFERENCES `Opportunity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cost` ADD CONSTRAINT `Cost_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cost` ADD CONSTRAINT `Cost_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivable` ADD CONSTRAINT `Receivable_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivable` ADD CONSTRAINT `Receivable_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivable` ADD CONSTRAINT `Receivable_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
