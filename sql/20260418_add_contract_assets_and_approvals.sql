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
