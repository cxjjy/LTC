# 周报体系模块阶段性实现记录

本文档用于沉淀当前“周报体系”模块的阶段性实现状态，方便：
- 业务用户快速理解当前能力边界
- 开发同学了解页面、接口、脚本和数据结构
- 后续 GPT / Agent 在当前上下文上继续扩展，而不是重复摸底

当前文档覆盖的范围包括：
- 个人周报
- 项目周报
- 管理汇总
- 周报自动生成草稿工作台
- 风险 / 协同任务闭环

## 1. 当前模块总体状态

当前周报体系已经不是“录入 demo”，而是具备以下闭环能力：
- 员工按自然周填写个人周报
- 系统根据规则自动生成草稿推荐
- 用户可采用、编辑、忽略推荐后保存并提交
- 项目周报可按项目聚合 `done / risk / plan`
- 管理汇总可查看提交率、风险池、催办分组和待处理事项
- 风险 / 协同内容会在提交周报时自动生成轻量任务，并支持状态流转

当前仍属于“外挂式接入”：
- 不侵入核心 Lead / Opportunity / Project / Contract / Delivery / Cost / Receivable 主链路
- 不引入数据库外键
- 不使用 Prisma migration / db push
- 所有新增表和字段均通过手写 SQL 接入共享库

## 2. 业务能力总览

### 2.1 个人周报
- 周期采用自然周，统一由服务端计算。
- 个人周报状态支持：
  - `draft`
  - `submitted`
  - `overdue`
  - `reviewed`
  - `returned`
- 页面已从传统空白表单升级为“自动生成草稿工作台”。
- 支持 `done / plan / risk` 三类条目。
- 每条条目支持：
  - `content`
  - `relatedProjectId`
  - `priority`
  - `needCoordination`
  - `expectedFinishAt`
  - `impactNote`
- 当前默认以开发 / 交付场景为主，个人周报编辑器已收敛掉默认的商机干扰字段。

### 2.2 项目周报
- 项目周报页已从空表格改为项目卡片汇总页。
- 以项目维度实时聚合本周个人周报条目，不再依赖“先生成快照才能查看”。
- 每个项目卡片展示：
  - 项目名称 / 编号
  - 负责人
  - 红黄绿状态
  - 本周完成
  - 风险
  - 下周计划
  - 协同数量
  - 关联任务
- 支持：
  - 查看详情
  - 标记风险
  - 跳转项目管理页

### 2.3 管理汇总
- 管理汇总已从“销售经营驾驶舱”重构为“开发团队周报驾驶舱”。
- KPI 聚焦：
  - 提交率
  - 未提交人数
  - 风险项目数
  - 协同事项数
  - 连续风险项目
  - 本周活跃项目数
  - 草稿人数
  - 已提交人数
- 趋势图聚焦：
  - 提交率趋势
  - 风险趋势
  - 未提交人数趋势
- 风险区可查看风险等级、连续周数和处理状态。
- 催办区已从右侧单列列表改成横向分组模块。

### 2.4 任务闭环
- 风险和协同已升级为可管理的轻量任务。
- 周报提交后自动生成任务：
  - `risk` -> 风险任务
  - `needCoordination = true` -> 协同任务
- 任务状态流转支持：
  - `open`
  - `processing`
  - `done`
- 项目周报页和管理汇总页都能直接看到任务并操作。

## 3. 数据模型与 SQL

### 3.1 已新增表
- `weekly_reports`
- `weekly_report_items`
- `project_weekly_snapshots`
- `weekly_report_audit_refs`
- `weekly_report_reminders`
- `weekly_report_suggestions`
- `weekly_tasks`

### 3.2 SQL 文件
- 一期：
  [20260417_add_weekly_reports_module.sql](/Users/chenxin/Desktop/LTC/sql/20260417_add_weekly_reports_module.sql)
- 二期增强：
  [20260417_add_weekly_reports_phase2.sql](/Users/chenxin/Desktop/LTC/sql/20260417_add_weekly_reports_phase2.sql)
- 草稿推荐：
  [20260417_add_weekly_report_suggestions.sql](/Users/chenxin/Desktop/LTC/sql/20260417_add_weekly_report_suggestions.sql)
- 轻量任务：
  [20260418_add_weekly_tasks.sql](/Users/chenxin/Desktop/LTC/sql/20260418_add_weekly_tasks.sql)

### 3.3 Prisma schema 映射
核心映射位于：
[prisma/schema.prisma](/Users/chenxin/Desktop/LTC/prisma/schema.prisma)

当前周报模块新增/扩展的模型包括：
- `WeeklyReport`
- `WeeklyReportItem`
- `ProjectWeeklySnapshot`
- `WeeklyReportAuditRef`
- `WeeklyReportReminder`
- `WeeklyReportSuggestion`
- `WeeklyTask`

## 4. 个人周报实现说明

### 4.1 页面结构
页面入口：
[app/(protected)/weekly-reports/[week]/page.tsx](/Users/chenxin/Desktop/LTC/app/(protected)/weekly-reports/[week]/page.tsx)

核心编辑器：
[modules/weekly-reports/ui/editor.tsx](/Users/chenxin/Desktop/LTC/modules/weekly-reports/ui/editor.tsx)

当前页面分为：
- 顶部工作台操作区
- 周报概览区
- `done / plan / risk` 三个 section
- 每个 section 下再分为：
  - 系统推荐区
  - 已采用条目区

### 4.2 草稿工作台
当前支持：
- `生成草稿`
- `应用全部推荐`
- 单条 `采用`
- `编辑后采用`
- `忽略推荐`
- `保存草稿`
- `提交周报`

推荐来源至少包括：
- `last_week_plan`
- `active_project`
- `ongoing_risk`
- `coordination`
- `project_update`
- `opportunity_update`（保留在数据层，当前页面主场景不强调）

### 4.3 提交规则
提交时校验：
- 至少有 1 条 `done` 或 `plan`
- `risk + high priority` 必须填写 `impactNote`

### 4.4 相关接口
- 当前周报工作台：
  [app/api/weekly-reports/current/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/current/route.ts)
- 保存草稿：
  [app/api/weekly-reports/[id]/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/[id]/route.ts)
- 提交周报：
  [app/api/weekly-reports/[id]/submit/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/[id]/submit/route.ts)
- 复制上周：
  [app/api/weekly-reports/[id]/copy-previous/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/[id]/copy-previous/route.ts)
- 审阅：
  [app/api/weekly-reports/[id]/review/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/[id]/review/route.ts)
- 退回：
  [app/api/weekly-reports/[id]/return/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/[id]/return/route.ts)
- 推荐列表：
  [app/api/weekly-reports/current/suggestions/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/current/suggestions/route.ts)
- 生成推荐：
  [app/api/weekly-reports/current/suggestions/generate/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/current/suggestions/generate/route.ts)
- 采用推荐：
  [app/api/weekly-reports/current/suggestions/apply/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/current/suggestions/apply/route.ts)
- 忽略推荐：
  [app/api/weekly-reports/current/suggestions/ignore/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-reports/current/suggestions/ignore/route.ts)

### 4.5 核心服务
核心服务位于：
[modules/weekly-reports/service.ts](/Users/chenxin/Desktop/LTC/modules/weekly-reports/service.ts)

当前主要能力：
- 周区间与周报懒创建
- 草稿保存
- 提交校验
- 复制上周
- 草稿推荐生成 / 采用 / 忽略
- 审阅 / 退回
- 催办
- 逾期状态同步
- 周报提交后自动触发任务同步

## 5. 项目周报实现说明

### 5.1 页面结构
列表页：
[app/(protected)/project-weekly/[week]/page.tsx](/Users/chenxin/Desktop/LTC/app/(protected)/project-weekly/[week]/page.tsx)

详情页：
[app/(protected)/project-weekly/[week]/[projectId]/page.tsx](/Users/chenxin/Desktop/LTC/app/(protected)/project-weekly/[week]/[projectId]/page.tsx)

### 5.2 汇总算法
当前项目周报页以“实时聚合”为主，不要求先执行快照生成任务才可查看。

聚合口径：
- 当前周所有 `weekly_reports`
- 当前周所有关联 `related_project_id` 的 `weekly_report_items`
- 按项目维度分组
- 聚合：
  - `doneItems`
  - `riskItems`
  - `planItems`
  - `coordinationCount`

优先排序规则：
- 红灯项目优先
- 黄灯项目其次
- 有协同项目再其次
- 然后按协同数、风险数排序

### 5.3 状态规则
项目状态灯规则：
- 无风险 -> `green`
- 有风险 -> `yellow`
- 连续风险 / 多条风险 / 手动标记风险 -> `red`

手动标记风险会写入项目周报快照的 `owner_note`，作为轻量人工干预标记。

### 5.4 相关接口与组件
- 项目周报列表 API：
  [app/api/project-weekly/[week]/route.ts](/Users/chenxin/Desktop/LTC/app/api/project-weekly/[week]/route.ts)
- 项目周报详情 API：
  [app/api/project-weekly/[week]/[projectId]/route.ts](/Users/chenxin/Desktop/LTC/app/api/project-weekly/[week]/[projectId]/route.ts)
- 项目风险标记 API：
  [app/api/project-weekly/[week]/[projectId]/mark-risk/route.ts](/Users/chenxin/Desktop/LTC/app/api/project-weekly/[week]/[projectId]/mark-risk/route.ts)
- 风险标记按钮：
  [modules/project-weekly/ui/mark-risk-button.tsx](/Users/chenxin/Desktop/LTC/modules/project-weekly/ui/mark-risk-button.tsx)

### 5.5 项目周报服务
服务位于：
[modules/project-weekly/service.ts](/Users/chenxin/Desktop/LTC/modules/project-weekly/service.ts)

当前能力：
- 项目周报快照生成
- 项目周报实时聚合列表
- 项目详情 fallback 聚合
- 连续风险识别
- 风险标记
- 项目关联任务汇总

## 6. 管理汇总实现说明

### 6.1 页面结构
入口：
[app/(protected)/management/weekly-summary/page.tsx](/Users/chenxin/Desktop/LTC/app/(protected)/management/weekly-summary/page.tsx)

驾驶舱组件：
[modules/management-weekly/ui/dashboard.tsx](/Users/chenxin/Desktop/LTC/modules/management-weekly/ui/dashboard.tsx)

当前页面采用 12 栏 grid，主要模块包括：
- KPI 区
- 趋势图区
- 风险项目池
- 待处理事项
- 催办分组

### 6.2 管理口径
当前已从“销售型驾驶舱”切换为“开发团队周报驾驶舱”。

核心 KPI：
- 提交率
- 未提交人数
- 风险项目数
- 协同事项数

辅助 KPI：
- 连续风险项目
- 本周活跃项目数
- 草稿人数
- 已提交人数

趋势图：
- 提交率趋势
- 风险趋势
- 未提交人数趋势

### 6.3 风险池
风险池展示：
- 项目
- 负责人
- 风险等级
- 连续周数
- 最近更新
- 处理状态

支持动作：
- 查看
- 标记已处理

风险处理标记接口：
[app/api/management/weekly-summary/[week]/risk-handled/route.ts](/Users/chenxin/Desktop/LTC/app/api/management/weekly-summary/[week]/risk-handled/route.ts)

### 6.4 催办分组
催办区已从右侧单列改为独立一整行的横向分组模块。

当前分组：
- 高优先级
- 中优先级
- 低优先级

当前行为：
- 默认每组最多显示 3 条
- 超出显示“查看更多（x人）”
- 仅局部展开该组
- 不再出现无限纵向滚动

### 6.5 待处理事项
管理汇总新增“待处理事项”模块，直接展示周报自动生成的任务：
- 高优先级：风险任务
- 中优先级：协同任务

## 7. 轻量任务系统实现说明

### 7.1 设计目标
任务系统当前是“周报附属能力”，不是通用任务平台。

目标是实现：
- 周报 -> 自动生成任务
- 任务 -> 跟进
- 任务 -> 完成
- 操作 -> 留痕

### 7.2 数据结构
Prisma 模型：
`WeeklyTask`

字段包括：
- `id`
- `type`
- `content`
- `projectId`
- `sourceReportId`
- `sourceItemId`
- `creatorId`
- `assigneeId`
- `status`
- `priority`
- `createdAt`
- `updatedAt`

### 7.3 自动生成规则
周报提交时：
- `risk` 条目 -> 自动生成 `risk` 任务
- `needCoordination = true` -> 自动生成 `collaboration` 任务

分配规则：
- 优先分配给项目负责人
- 若未关联项目，则回退给周报提交人

去重规则：
- 以 `source_report_id + source_item_id + type` 为主
- 已存在未完成任务则更新，不重复新建

### 7.4 状态流转
任务状态：
- `open`
- `processing`
- `done`

支持动作：
- 开始处理
- 标记完成
- 重新打开

相关文件：
- 服务：
  [modules/weekly-tasks/service.ts](/Users/chenxin/Desktop/LTC/modules/weekly-tasks/service.ts)
- 状态按钮：
  [modules/weekly-tasks/ui/task-status-actions.tsx](/Users/chenxin/Desktop/LTC/modules/weekly-tasks/ui/task-status-actions.tsx)
- 状态更新 API：
  [app/api/weekly-tasks/[id]/status/route.ts](/Users/chenxin/Desktop/LTC/app/api/weekly-tasks/[id]/status/route.ts)

### 7.5 页面接入点
项目周报页：
- 风险区展示关联任务
- 可直接更新任务状态

管理汇总页：
- 新增待处理事项模块
- 用户催办卡片显示未完成任务数

## 8. 审计与定时任务

### 8.1 审计
审计封装：
[lib/weekly-report-audit.ts](/Users/chenxin/Desktop/LTC/lib/weekly-report-audit.ts)

当前已接入的周报审计动作包括：
- 创建周报
- 更新周报
- 删除周报条目
- 提交周报
- 生成推荐
- 采用推荐
- 忽略推荐
- 审阅
- 退回
- 催办
- 创建任务
- 任务状态流转
- 项目风险已处理

### 8.2 定时任务
- 草稿预创建：
  [scripts/generate-weekly-drafts.ts](/Users/chenxin/Desktop/LTC/scripts/generate-weekly-drafts.ts)
- 项目快照生成：
  [scripts/generate-project-weekly-snapshots.ts](/Users/chenxin/Desktop/LTC/scripts/generate-project-weekly-snapshots.ts)
- 逾期状态同步：
  [scripts/sync-weekly-report-statuses.ts](/Users/chenxin/Desktop/LTC/scripts/sync-weekly-report-statuses.ts)

## 9. 当前测试覆盖

测试文件：
[tests/weekly-report-module.test.ts](/Users/chenxin/Desktop/LTC/tests/weekly-report-module.test.ts)

当前已覆盖：
- 自然周范围计算
- 提交校验
- 高风险影响说明校验
- 风险灯色判断
- 项目周报 `done / risk / plan` 聚合
- 提交率统计
- 当前周报懒创建
- 无权修改他人周报
- 催办能力
- 推荐草稿生成
- 采用推荐
- 周报提交自动生成任务
- 任务状态流转
- 风险项目已处理

## 10. 当前已知边界

- 任务系统当前是周报附属能力，不支持复杂的评论、附件、提醒计划或多责任人。
- 项目状态灯当前主要基于周报风险条目、连续风险和手动标记，不等于完整项目健康度模型。
- 项目“最近访问”仍然没有单独埋点，部分推荐逻辑仍使用“最近操作”近似代替。
- 由于共享库约束，所有关联关系仍由应用层维护，没有数据库外键保护。
- 当前催办接口只记录催办事件，未直接发送钉钉消息。

## 11. 当前推荐的阅读顺序

如果是业务方阅读，建议顺序：
1. 本文档第 2 节“业务能力总览”
2. 第 4 节“个人周报”
3. 第 5 节“项目周报”
4. 第 6 节“管理汇总”
5. 第 7 节“轻量任务系统”

如果是开发 / GPT 阅读，建议顺序：
1. [prisma/schema.prisma](/Users/chenxin/Desktop/LTC/prisma/schema.prisma)
2. [modules/weekly-reports/service.ts](/Users/chenxin/Desktop/LTC/modules/weekly-reports/service.ts)
3. [modules/project-weekly/service.ts](/Users/chenxin/Desktop/LTC/modules/project-weekly/service.ts)
4. [modules/management-weekly/service.ts](/Users/chenxin/Desktop/LTC/modules/management-weekly/service.ts)
5. [modules/weekly-tasks/service.ts](/Users/chenxin/Desktop/LTC/modules/weekly-tasks/service.ts)
6. 对应的 page / api / ui 组件
