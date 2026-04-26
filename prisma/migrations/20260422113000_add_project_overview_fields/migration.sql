ALTER TABLE `Project`
  ADD COLUMN `delivery_mode` VARCHAR(50) NULL AFTER `plannedEndDate`,
  ADD COLUMN `region` VARCHAR(100) NULL AFTER `delivery_mode`;
