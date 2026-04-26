-- Production schema release bundle
-- Assumption:
-- 1. Production already has the baseline tables shown in the screenshot:
--    _prisma_migrations, AuditLog, auth_bindings, CodeSequence, Contract, ContractAttachment,
--    Cost, Customer, Delivery, Lead, Opportunity, permissions, Project, Receivable,
--    role_permissions, roles, User, user_roles
-- 2. The statements below are intended to be run once, in order, on production.
-- 3. This file includes non-destructive schema additions and datetime normalization only.

-- =========================================================
-- 1. User identity fields
-- Source: prisma/migrations/20260418093000_add_user_identity_fields/migration.sql
-- =========================================================
ALTER TABLE `User`
  ADD COLUMN `ding_user_id` VARCHAR(191) NULL AFTER `username`,
  ADD COLUMN `display_name` VARCHAR(100) NULL AFTER `ding_user_id`;

UPDATE `User`
SET `display_name` = COALESCE(NULLIF(`name`, ''), `username`)
WHERE `display_name` IS NULL;

ALTER TABLE `User`
  MODIFY COLUMN `display_name` VARCHAR(100) NOT NULL;

CREATE UNIQUE INDEX `User_ding_user_id_key` ON `User`(`ding_user_id`);

-- =========================================================
-- 2. Weekly reports base module
-- Source: sql/20260417_add_weekly_reports_module.sql
-- =========================================================
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

-- =========================================================
-- 3. Weekly report suggestions
-- Source: sql/20260417_add_weekly_report_suggestions.sql
-- =========================================================
CREATE TABLE IF NOT EXISTS `weekly_report_suggestions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '推荐主键',
  `user_id` VARCHAR(191) NOT NULL COMMENT '用户ID',
  `week_start` DATE NOT NULL COMMENT '周一日期',
  `section_type` VARCHAR(20) NOT NULL COMMENT 'done/plan/risk',
  `source_type` VARCHAR(50) NOT NULL COMMENT 'last_week_plan/active_project/ongoing_risk/coordination/project_update/opportunity_update',
  `source_ref` VARCHAR(191) NULL COMMENT '来源引用ID',
  `reason` VARCHAR(255) NULL COMMENT '推荐原因',
  `content` TEXT NOT NULL COMMENT '推荐内容',
  `related_project_id` VARCHAR(191) NULL COMMENT '关联项目ID',
  `related_opportunity_id` VARCHAR(191) NULL COMMENT '关联商机ID',
  `confidence_score` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '置信度',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/applied/ignored',
  `extra_payload` JSON NULL COMMENT '扩展字段载荷',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_week_status` (`user_id`, `week_start`, `status`),
  KEY `idx_source_type` (`source_type`),
  KEY `idx_related_project_id` (`related_project_id`),
  KEY `idx_related_opportunity_id` (`related_opportunity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个人周报系统推荐草稿表';

-- =========================================================
-- 4. Weekly reports phase 2
-- Source: sql/20260417_add_weekly_reports_phase2.sql
-- =========================================================
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

-- =========================================================
-- 5. Weekly tasks
-- Source: sql/20260418_add_weekly_tasks.sql
-- =========================================================
CREATE TABLE IF NOT EXISTS `weekly_tasks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(30) NOT NULL COMMENT 'risk | collaboration',
  `content` TEXT NOT NULL,
  `project_id` VARCHAR(191) NULL,
  `source_report_id` BIGINT NOT NULL,
  `source_item_id` BIGINT NULL,
  `creator_id` VARCHAR(191) NOT NULL,
  `assignee_id` VARCHAR(191) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT 'open | processing | done',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`type`, `status`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_source_report_id` (`source_report_id`),
  KEY `idx_source_item_id` (`source_item_id`),
  KEY `idx_assignee_status` (`assignee_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='周报自动生成的轻量任务表';

-- =========================================================
-- 6. Contract assets, invoice/payment records, contract approvals
-- Source: sql/20260418_add_contract_assets_and_approvals.sql
-- =========================================================
CREATE TABLE IF NOT EXISTS `biz_attachments` (
  `id` varchar(191) NOT NULL,
  `biz_type` varchar(50) NOT NULL,
  `biz_id` varchar(191) NOT NULL,
  `project_id` varchar(191) DEFAULT NULL,
  `contract_id` varchar(191) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` varchar(191) NOT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `remark` text DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_biz_type_id` (`biz_type`, `biz_id`),
  KEY `idx_project_biz_type` (`project_id`, `biz_type`),
  KEY `idx_contract_biz_type` (`contract_id`, `biz_type`),
  KEY `idx_uploaded_at` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoice_records` (
  `id` varchar(191) NOT NULL,
  `contract_id` varchar(191) NOT NULL,
  `project_id` varchar(191) DEFAULT NULL,
  `invoice_no` varchar(100) NOT NULL,
  `invoice_type` varchar(50) NOT NULL,
  `invoice_amount` decimal(18,2) NOT NULL,
  `invoice_date` date NOT NULL,
  `payer_name` varchar(200) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'issued',
  `attachment_id` varchar(191) DEFAULT NULL,
  `created_by` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contract_invoice_no` (`contract_id`, `invoice_no`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_status` (`status`),
  KEY `idx_invoice_date` (`invoice_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` varchar(191) NOT NULL,
  `contract_id` varchar(191) NOT NULL,
  `project_id` varchar(191) DEFAULT NULL,
  `payment_amount` decimal(18,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payer_name` varchar(200) DEFAULT NULL,
  `source_type` varchar(30) NOT NULL DEFAULT 'manual',
  `source_ref` varchar(191) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `created_by` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_contract_payment_date` (`contract_id`, `payment_date`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_source_type` (`source_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `opportunity_contract_approvals` (
  `id` varchar(191) NOT NULL,
  `opportunity_id` varchar(191) NOT NULL,
  `applicant_id` varchar(191) NOT NULL,
  `approver_id` varchar(191) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `approval_comment` text DEFAULT NULL,
  `submitted_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `approved_at` datetime(3) DEFAULT NULL,
  `rejected_at` datetime(3) DEFAULT NULL,
  `created_contract_id` varchar(191) DEFAULT NULL,
  `snapshot_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_opportunity_status` (`opportunity_id`, `status`),
  KEY `idx_applicant_status` (`applicant_id`, `status`),
  KEY `idx_approver_status` (`approver_id`, `status`),
  KEY `idx_submitted_at` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` (`id`, `code`, `name`, `module`, `action`, `description`, `createdAt`, `updatedAt`)
SELECT
  REPLACE(UUID(), '-', ''),
  seed.code,
  seed.name,
  seed.module,
  seed.action,
  seed.description,
  NOW(3),
  NOW(3)
FROM (
  SELECT 'contract_approval:view' AS code, '查看转合同审批' AS name, 'contract_approval' AS module, 'view' AS action, '查看转合同审批列表与详情' AS description
  UNION ALL
  SELECT 'contract_approval:create', '发起转合同审批', 'contract_approval', 'create', '提交商机转合同审批申请'
  UNION ALL
  SELECT 'contract_approval:change_status', '审批转合同申请', 'contract_approval', 'change_status', '审批通过或驳回转合同申请'
) AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM `permissions` p
  WHERE p.`code` = seed.`code`
);

-- =========================================================
-- 7. Normalize DATETIME precision/defaults to (3)
-- Source: sql/20260418_normalize_datetime3_current_timestamp3.sql
-- =========================================================
ALTER TABLE `project_weekly_snapshots`
  MODIFY COLUMN `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `project_weekly_snapshots`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_report_audit_refs`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_report_items`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_report_items`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_report_reminders`
  MODIFY COLUMN `reminded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_report_suggestions`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

ALTER TABLE `weekly_report_suggestions`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `submitted_at` DATETIME(3) NULL COMMENT '提交时间';

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `last_saved_at` DATETIME(3) NULL COMMENT '最近保存时间';

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `reviewed_at` DATETIME(3) NULL COMMENT '审阅时间';

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `returned_at` DATETIME(3) NULL COMMENT '退回时间';

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `overdue_marked_at` DATETIME(3) NULL COMMENT '逾期标记时间';

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_reports`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_tasks`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `weekly_tasks`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
