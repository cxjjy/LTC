# LTC 项目当前上下文记录

> 更新时间：2026-04-23
> 说明：这份文档用于记录当前仓库已经完成的功能、部署背景、最近改动和后续注意事项，方便继续开发、交接或让其他 AI 重新学习项目上下文。

---

## 1. 项目基础信息

- 项目目录：`/Users/chenxin/Desktop/LTC`
- 技术栈：
  - Next.js 14
  - TypeScript
  - App Router
  - Tailwind CSS
  - Prisma
  - MySQL
  - Zod
  - React Hook Form
  - TanStack Table
  - ECharts
- 本地访问地址：
  - `http://localhost:3000`

---

## 2. 系统定位

当前系统定位为：

- `LTC项目管理`
- 偏“项目管理 + 经营管理 + CRM 工作台”
- 不是营销官网风，也不是 Apple 展示风

核心业务链路：

`Lead -> Opportunity -> Project -> Contract -> Delivery -> Cost -> Receivable`

---

## 3. 已完成的核心能力

### 3.1 基础业务模块

已包含：

- 客户管理
- 线索管理
- 商机管理
- 项目管理
- 合同管理
- 交付管理
- 成本管理
- 回款管理
- 审计日志

并包含：

- 列表页
- 新建页
- 编辑页
- 详情页

### 3.2 列表页统一能力

已统一建设：

- 搜索
- 筛选
- 排序
- 显示列
- 分页
- 导出
- 重置
- 统一操作列
- 统一删除能力

说明：

- 导入功能已经统一隐藏
- 批量删除、批量状态更新入口也已隐藏

### 3.3 详情页统一能力

已统一补齐：

- 面包屑
- 返回路径
- 右上角操作区
- 编辑 / 删除

### 3.4 Dashboard / 驾驶舱

首页概览已演进为经营驾驶舱，包含：

- KPI 摘要
- 利润分析
- 现金流分析
- 风险预警
- 销售漏斗
- 重点项目列表

图表使用 ECharts。

### 3.5 RBAC 权限

已建立基础 RBAC 能力：

- User
- Role
- Permission
- UserRole
- RolePermission

已具备：

- 菜单权限
- 页面权限
- 按钮权限
- 服务端权限校验

系统管理模块包含：

- 用户管理
- 角色管理
- 权限查看
- 审计日志

### 3.6 删除能力

已统一实现：

- 单条删除
- 二次确认
- 默认软删除
- 删除写审计日志
- 删除成功后刷新
- 有关联数据时阻止删除

### 3.7 商机预估毛利

Opportunity 已支持：

- 预估收入
- 预估人工/外包/采购/差旅/其他成本
- 自动计算总成本、毛利、毛利率
- 风险提示（低毛利 / 高风险）

### 3.8 合同附件管理

合同详情页已支持：

- 上传附件
- 查看附件列表
- 下载附件
- 删除附件

业务规则：

- 合同无附件不能变为 `EFFECTIVE`
- 上传 / 删除写审计日志
- 权限受控

---

## 4. 当前部署上下文（K8s）

### 4.1 集群与节点

- Kubernetes：`v1.19.x`
- 节点：
  - `codewave01`：无外网，负责 `kubectl`
  - `codewave02`：有外网，负责运行 Pod 和拉镜像
- 应用必须调度到：
  - `codewave02`

### 4.2 Ingress / 公网入口

当前暴露方式：

- HTTP：`31281`
- HTTPS：`30207`

Ingress 依赖 Host 匹配。

### 4.3 当前外部访问结论

当前问题核心不是 K8s 本身，而是公网入口限制：

- 域名未备案会被拦截
- 80/443 被低代码平台占用
- 无法直接接管公网入口

当前临时可用访问方式：

- `http://115.29.162.74:31281`

### 4.4 镜像与命名空间

- namespace：`ltc`
- 镜像：
  - `registry.cn-hangzhou.aliyuncs.com/ssalcloud/ltc-app:latest`

### 4.5 数据库

- MySQL 5.7
- 地址：`172.26.49.155:3306`
- 数据库：`ltc_db`

当前 Prisma 连接信息：

```prisma
datasource db {
  provider = "mysql"
  url      = "mysql://qzmysql:i2aKzeFsNQlTckf0Grw@172.26.49.155:3306/ltc_db"
}
```

强约束说明：

- 数据库已从 `default_db` 切换为 `ltc_db`
- 所有数据必须写入 `ltc_db`
- 不允许再使用 `default_db`
- 低代码数据库不可修改

---

## 5. CI/CD 现状

已打通：

- GitHub Actions
- Docker 构建
- ACR 推送
- 远程 kubectl 更新

重要经验：

- 以前页面不更新时，主要要排查：
  - `latest` 镜像缓存
  - rollout restart 没有真正拉到新镜像

更稳的建议仍然是：

- 使用 `${GITHUB_SHA}` 作为镜像 tag
- 用 `kubectl set image` 更新 Deployment

---

## 6. 最近完成的前端/体验修正

### 6.0 本地运行时稳定方案（2026-04-23）

当前仓库已确认一组本机可用的稳定运行方式：

- `Next.js 14` 应用运行使用 `Node 20`
- `Tailwind CSS` 样式预编译使用系统 `Node 22`

原因：

- `Next.js 14` 在当前机器上用 `Node 22` 运行时，容易出现端口存在但页面长时间转圈的问题
- `app/globals.css` 在当前机器上用 `Node 20` 走 Tailwind 编译会卡住，但用系统 `Node 22` 可正常完成

已落地实现：

- `.nvmrc` 固定为 `20`
- `scripts/check-node-version.mjs`：校验 `dev / build / start` 必须跑在 `Node 20`
- `scripts/build-styles.mjs`：调用系统 `Node 22` 预编译 `app/globals.css`
- 输出文件：`app/generated-tailwind.css`
- `app/layout.tsx` 已改为直接加载 `generated-tailwind.css`
- `package.json` 中 `predev / prebuild / prestart` 都会自动执行样式预编译
- `dev` 脚本已恢复为标准：
  - `next dev -H 127.0.0.1 -p 3000`

运维注意：

- 不要再切回之前的自定义 `dev-server` 启动方式
- 若页面能打开但无样式，先确认 `app/generated-tailwind.css` 是否已更新
- 若样式预编译失败，先检查 `/usr/local/bin/node` 是否仍为可用的 `Node 22`

### 6.1 登录页

已经做过：

- 删除演示环境默认账号/密码提示区
- 登录说明改成更适合生产环境的文案
- 用户名 placeholder 从：
  - `例如：admin`
  改为：
  - `请输入账号`
- 登录错误提示已改为用户可理解的文案

### 6.2 用户菜单

已经做过：

- 退出登录增加二次确认
- 去掉“个人信息 / 系统设置”后面的“即将开放”

### 6.3 搜索框

列表页搜索框已经统一放大，避免 placeholder 被截断。

---

## 7. 钉钉网页登录接入（当前最新开发重点）

### 7.1 目标

在保留原账号密码登录的前提下，新增：

- “使用钉钉登录”按钮
- 通过钉钉网页 OAuth2 登录 LTC

### 7.2 当前已确认配置

- `DINGTALK_CLIENT_ID = dingrwonqkyjz5xcgrlp`
- `DINGTALK_REDIRECT_URI = https://ltc.ssalcloud.com/api/auth/dingtalk/callback`
- `DINGTALK_CLIENT_SECRET` 由环境变量注入

### 7.3 实现策略

采用：

- 钉钉网页登录 OAuth2 code 流程
- 服务端处理 `/api/auth/dingtalk/login`
- 服务端处理 `/api/auth/dingtalk/callback`
- 首次登录自动创建本地用户
- 默认角色：`VIEWER`
- 通过 `AuthBinding` 维护绑定关系
- 复用现有 `ltc_session` 登录态

### 7.4 当前已修改文件

以下文件已经完成钉钉登录相关改造：

- [/Users/chenxin/Desktop/LTC/prisma/schema.prisma](/Users/chenxin/Desktop/LTC/prisma/schema.prisma)
- [/Users/chenxin/Desktop/LTC/prisma/seed.ts](/Users/chenxin/Desktop/LTC/prisma/seed.ts)
- [/Users/chenxin/Desktop/LTC/prisma/migrations/20260414090000_add_auth_bindings/migration.sql](/Users/chenxin/Desktop/LTC/prisma/migrations/20260414090000_add_auth_bindings/migration.sql)
- [/Users/chenxin/Desktop/LTC/lib/dingtalk.ts](/Users/chenxin/Desktop/LTC/lib/dingtalk.ts)
- [/Users/chenxin/Desktop/LTC/app/api/auth/dingtalk/login/route.ts](/Users/chenxin/Desktop/LTC/app/api/auth/dingtalk/login/route.ts)
- [/Users/chenxin/Desktop/LTC/app/api/auth/dingtalk/callback/route.ts](/Users/chenxin/Desktop/LTC/app/api/auth/dingtalk/callback/route.ts)
- [/Users/chenxin/Desktop/LTC/app/(auth)/login/page.tsx](/Users/chenxin/Desktop/LTC/app/(auth)/login/page.tsx)
- [/Users/chenxin/Desktop/LTC/.env.example](/Users/chenxin/Desktop/LTC/.env.example)
- [/Users/chenxin/Desktop/LTC/README.md](/Users/chenxin/Desktop/LTC/README.md)

### 7.5 当前已写入本地 .env 的配置

本地 `.env` 已补上：

- `DINGTALK_CLIENT_ID`
- `DINGTALK_CLIENT_SECRET`
- `DINGTALK_REDIRECT_URI`
- `DINGTALK_SCOPE`
- `DINGTALK_STATE_SECRET`

说明：

- secret 目前只写入本地 `.env`
- 不应提交进 git

### 7.6 当前钉钉登录功能实现状态

已完成：

- AuthBinding 模型
- migration 文件
- 钉钉 OAuth 服务端代码
- 登录页“使用钉钉登录”按钮
- 回调后自动创建本地用户
- 复用现有 session/cookie
- 错误码跳转：
  - `dingtalk_state_invalid`
  - `dingtalk_userid_missing`
  - `dingtalk_oauth_failed`

仍需联调确认：

- 钉钉后台 redirect URI 配置
- 公网域名 `https://ltc.ssalcloud.com/api/auth/dingtalk/callback` 是否可被钉钉正常访问
- K8s Secret / Deployment 中补钉钉环境变量

---

## 8. 最近验证结果

当前已验证通过：

- `npx prisma generate`
- `npm run build`

说明：

- 钉钉接入代码至少已达到可构建状态

---

## 9. 当前未提交改动（截至此文档更新时）

当前工作区与钉钉登录直接相关的未提交改动包括：

- `.env.example`
- `README.md`
- `app/(auth)/login/page.tsx`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/dingtalk.ts`
- `app/api/auth/dingtalk/login/route.ts`
- `app/api/auth/dingtalk/callback/route.ts`
- `prisma/migrations/20260414090000_add_auth_bindings/`

说明：

- 这些是当前需要重点关注和后续提交的改动

---

## 10. 当前建议的后续动作

### 如果继续做钉钉登录联调

建议顺序：

1. 启动本地最新服务
2. 检查登录页是否展示“使用钉钉登录”按钮
3. 确认 `/api/auth/dingtalk/login` 能正常 302
4. 确认钉钉后台 redirect URI 配置无误
5. 在 K8s Secret 中补钉钉环境变量
6. 部署到公网可访问环境验证回调

### 如果继续做生产化清理

建议继续排查：

- 系统中是否还有“演示 / 默认密码 / demo / 即将开放”字样
- 用户管理列表是否仍存在不合理的密码展示
- 是否仍有仅开发环境可用的文案暴露给生产用户

---

## 11. 给后续接手者的注意事项

### 用户偏好

用户非常明确：

- 要直接改代码，不要只讲方案
- 喜欢成熟 CRM / 项目管理 / 经营后台风格
- 不喜欢 Apple 官网风、营销 SaaS 风、漂浮卡片风
- 很介意“按钮没反应”“看起来能用但其实是假功能”
- 很介意技术错误直接暴露给用户

### 开发原则

- 不要破坏现有用户名密码登录
- 不要推翻已有统一结构
- 新功能优先接入现有抽象
- 优先保证：
  - 可运行
  - 可部署
  - 权限真实生效
  - 提示可读
