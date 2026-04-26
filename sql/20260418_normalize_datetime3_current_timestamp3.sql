-- Scan target: database `ltc`
-- Generated from information_schema; review before applying.
-- Non-destructive only: MODIFY COLUMN to normalize DATETIME precision/defaults.

-- project_weekly_snapshots.generated_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `project_weekly_snapshots`
  MODIFY COLUMN `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- project_weekly_snapshots.updated_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
ALTER TABLE `project_weekly_snapshots`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- weekly_report_audit_refs.created_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `weekly_report_audit_refs`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- weekly_report_items.created_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `weekly_report_items`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- weekly_report_items.updated_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
ALTER TABLE `weekly_report_items`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- weekly_report_reminders.reminded_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `weekly_report_reminders`
  MODIFY COLUMN `reminded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- weekly_report_suggestions.created_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `weekly_report_suggestions`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间';

-- weekly_report_suggestions.updated_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
ALTER TABLE `weekly_report_suggestions`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间';

-- weekly_reports.submitted_at: datetime
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `submitted_at` DATETIME(3) NULL COMMENT '提交时间';

-- weekly_reports.last_saved_at: datetime
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `last_saved_at` DATETIME(3) NULL COMMENT '最近保存时间';

-- weekly_reports.reviewed_at: datetime
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `reviewed_at` DATETIME(3) NULL COMMENT '审阅时间';

-- weekly_reports.returned_at: datetime
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `returned_at` DATETIME(3) NULL COMMENT '退回时间';

-- weekly_reports.overdue_marked_at: datetime
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `overdue_marked_at` DATETIME(3) NULL COMMENT '逾期标记时间';

-- weekly_reports.created_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- weekly_reports.updated_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
ALTER TABLE `weekly_reports`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- weekly_tasks.created_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
ALTER TABLE `weekly_tasks`
  MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- weekly_tasks.updated_at: datetime DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
ALTER TABLE `weekly_tasks`
  MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
