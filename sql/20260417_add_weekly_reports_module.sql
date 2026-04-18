CREATE TABLE IF NOT EXISTS `weekly_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '个人周报主键',
  `user_id` VARCHAR(191) NOT NULL COMMENT '逻辑关联 users.id',
  `week_start` DATE NOT NULL COMMENT '自然周周一',
  `week_end` DATE NOT NULL COMMENT '自然周周日',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/submitted',
  `summary` TEXT NULL COMMENT '补充摘要',
  `submitted_at` DATETIME NULL COMMENT '提交时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_week` (`user_id`, `week_start`),
  KEY `idx_week_start` (`week_start`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个人周报主表';

CREATE TABLE IF NOT EXISTS `weekly_report_items` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '周报条目主键',
  `report_id` BIGINT NOT NULL COMMENT '逻辑关联 weekly_reports.id',
  `item_type` VARCHAR(20) NOT NULL COMMENT 'done/plan/risk',
  `content` TEXT NOT NULL COMMENT '条目内容',
  `related_project_id` VARCHAR(191) NULL COMMENT '逻辑关联 projects.id',
  `related_opportunity_id` VARCHAR(191) NULL COMMENT '逻辑关联 opportunities.id',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_report_id` (`report_id`),
  KEY `idx_item_type` (`item_type`),
  KEY `idx_related_project_id` (`related_project_id`),
  KEY `idx_related_opportunity_id` (`related_opportunity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个人周报条目表';

CREATE TABLE IF NOT EXISTS `project_weekly_snapshots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '项目周报快照主键',
  `project_id` VARCHAR(191) NOT NULL COMMENT '逻辑关联 projects.id',
  `week_start` DATE NOT NULL COMMENT '自然周周一',
  `week_end` DATE NOT NULL COMMENT '自然周周日',
  `progress_summary` TEXT NULL COMMENT '系统聚合摘要',
  `cost_delta` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '本周成本增量',
  `receivable_delta` DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '本周回款增量',
  `risk_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '风险标记',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_week` (`project_id`, `week_start`),
  KEY `idx_week_start` (`week_start`),
  KEY `idx_risk_flag` (`risk_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目周报快照表';

CREATE TABLE IF NOT EXISTS `weekly_report_audit_refs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '周报补充审计索引主键',
  `entity_type` VARCHAR(50) NOT NULL COMMENT 'weekly_report/weekly_report_item/project_weekly_snapshot/management_weekly_view',
  `entity_id` VARCHAR(191) NOT NULL COMMENT '实体主键',
  `action` VARCHAR(50) NOT NULL COMMENT 'create/update/delete_item/submit/generate/view',
  `operator_user_id` VARCHAR(191) NOT NULL COMMENT '操作者用户ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_operator` (`operator_user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='周报模块审计引用表';
