ALTER TABLE `weekly_reports`
  ADD COLUMN `last_saved_at` DATETIME NULL COMMENT '最近保存时间' AFTER `submitted_at`,
  ADD COLUMN `review_note` TEXT NULL COMMENT '审阅意见' AFTER `last_saved_at`,
  ADD COLUMN `reviewed_at` DATETIME NULL COMMENT '审阅时间' AFTER `review_note`,
  ADD COLUMN `reviewed_by` VARCHAR(191) NULL COMMENT '审阅人' AFTER `reviewed_at`,
  ADD COLUMN `return_note` TEXT NULL COMMENT '退回说明' AFTER `reviewed_by`,
  ADD COLUMN `returned_at` DATETIME NULL COMMENT '退回时间' AFTER `return_note`,
  ADD COLUMN `returned_by` VARCHAR(191) NULL COMMENT '退回人' AFTER `returned_at`,
  ADD COLUMN `overdue_marked_at` DATETIME NULL COMMENT '逾期标记时间' AFTER `returned_by`,
  ADD KEY `idx_reviewed_by` (`reviewed_by`),
  ADD KEY `idx_returned_by` (`returned_by`),
  ADD KEY `idx_last_saved_at` (`last_saved_at`);

ALTER TABLE `weekly_report_items`
  ADD COLUMN `priority` VARCHAR(20) NOT NULL DEFAULT 'medium' COMMENT 'low/medium/high' AFTER `content`,
  ADD COLUMN `need_coordination` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要协同' AFTER `priority`,
  ADD COLUMN `expected_finish_at` DATE NULL COMMENT '计划预计完成时间' AFTER `need_coordination`,
  ADD COLUMN `impact_note` TEXT NULL COMMENT '高风险影响说明' AFTER `expected_finish_at`,
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_need_coordination` (`need_coordination`),
  ADD KEY `idx_expected_finish_at` (`expected_finish_at`);

ALTER TABLE `project_weekly_snapshots`
  ADD COLUMN `risk_count` INT NOT NULL DEFAULT 0 COMMENT '风险条目数' AFTER `risk_flag`,
  ADD COLUMN `traffic_light_status` VARCHAR(20) NOT NULL DEFAULT 'green' COMMENT 'green/yellow/red' AFTER `risk_count`,
  ADD COLUMN `weekly_actions` TEXT NULL COMMENT '本周动作摘要' AFTER `traffic_light_status`,
  ADD COLUMN `owner_note` TEXT NULL COMMENT '负责人补充说明' AFTER `weekly_actions`,
  ADD KEY `idx_traffic_light_status` (`traffic_light_status`);

CREATE TABLE IF NOT EXISTS `weekly_report_reminders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '催办记录主键',
  `week_start` DATE NOT NULL COMMENT '催办周期周一',
  `report_id` BIGINT NULL COMMENT '对应周报ID，可空',
  `target_user_id` VARCHAR(191) NOT NULL COMMENT '被催办人',
  `message` VARCHAR(255) NULL COMMENT '催办说明',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/sent/acknowledged',
  `reminded_by` VARCHAR(191) NOT NULL COMMENT '催办发起人',
  `reminded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_week_target` (`week_start`, `target_user_id`),
  KEY `idx_report_id` (`report_id`),
  KEY `idx_status` (`status`),
  KEY `idx_reminded_by` (`reminded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='周报催办记录表';
