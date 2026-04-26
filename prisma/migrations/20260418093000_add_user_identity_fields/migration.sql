ALTER TABLE `User`
  ADD COLUMN `ding_user_id` VARCHAR(191) NULL AFTER `username`,
  ADD COLUMN `display_name` VARCHAR(100) NULL AFTER `ding_user_id`;

UPDATE `User`
SET `display_name` = COALESCE(NULLIF(`name`, ''), `username`)
WHERE `display_name` IS NULL;

ALTER TABLE `User`
  MODIFY COLUMN `display_name` VARCHAR(100) NOT NULL;

CREATE UNIQUE INDEX `User_ding_user_id_key` ON `User`(`ding_user_id`);
