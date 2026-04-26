-- Support integrated / joint-delivery projects with supplier-side contracts, invoices and payments.

CREATE TABLE `suppliers` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `contact_name` VARCHAR(100) NULL,
  `contact_phone` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `remark` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `updated_by` VARCHAR(191) NOT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `suppliers_code_key` (`code`),
  INDEX `idx_supplier_name_deleted` (`name`, `is_deleted`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Project`
  ADD COLUMN `owner_name` VARCHAR(100) NULL;

CREATE TABLE `project_suppliers` (
  `id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `supplier_id` VARCHAR(191) NOT NULL,
  `role` VARCHAR(100) NULL,
  `remark` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `updated_by` VARCHAR(191) NOT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_project_supplier` (`project_id`, `supplier_id`),
  INDEX `idx_supplier_deleted` (`supplier_id`, `is_deleted`),
  INDEX `idx_project_deleted` (`project_id`, `is_deleted`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Contract`
  ADD COLUMN `supplier_id` VARCHAR(191) NULL,
  ADD COLUMN `direction` ENUM('SALES', 'PURCHASE') NOT NULL DEFAULT 'SALES';

ALTER TABLE `invoice_records`
  ADD COLUMN `direction` ENUM('OUTPUT', 'INPUT') NOT NULL DEFAULT 'OUTPUT';

ALTER TABLE `payment_records`
  ADD COLUMN `direction` ENUM('INFLOW', 'OUTFLOW') NOT NULL DEFAULT 'INFLOW';

CREATE INDEX `Contract_supplier_id_isDeleted_idx` ON `Contract`(`supplier_id`, `isDeleted`);
CREATE INDEX `Contract_direction_isDeleted_idx` ON `Contract`(`direction`, `isDeleted`);
CREATE INDEX `idx_direction` ON `invoice_records`(`direction`);
CREATE INDEX `idx_direction` ON `payment_records`(`direction`);

ALTER TABLE `project_suppliers`
  ADD CONSTRAINT `project_suppliers_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_suppliers`
  ADD CONSTRAINT `project_suppliers_supplier_id_fkey`
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Contract`
  ADD CONSTRAINT `Contract_supplier_id_fkey`
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
