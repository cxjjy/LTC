# LTC 项目交接文档

> 更新时间：2026-04-17
> 用途：给新的 GPT / AI 助手快速学习 LTC 项目当前状态、历史问题、已完成修复、数据库边界与后续注意事项。

---

## 1. 项目概况

- 项目名：`LTC 项目管理系统`
- 目录：`/Users/chenxin/Desktop/LTC`
- 技术栈：
  - Next.js 14
  - TypeScript
  - App Router
  - Tailwind CSS
  - Prisma
  - MySQL
  - React Hook Form
  - Zod
  - TanStack Table
- 本地开发地址：
  - `http://localhost:3000`
- 线上域名：
  - `https://ltc.ssalcloud.com`

核心业务链路：

`Lead -> Opportunity -> Project -> Contract -> Delivery -> Cost -> Receivable`

---

## 2. 当前功能状态

已完成主要模块：

- 客户管理
- 线索管理
- 商机管理
- 项目管理
- 合同管理
- 交付管理
- 成本管理
- 回款管理
- 审计日志
- RBAC 权限体系
- Dashboard 驾驶舱

当前已新增钉钉网页登录能力：

- 登录入口：
  - `GET /api/auth/dingtalk/login`
- 回调入口：
  - `GET /api/auth/dingtalk/callback`

钉钉首次登录时：

- 自动创建本地用户
- 默认角色为 `VIEWER`
- 会创建 `auth_bindings` 绑定记录

---

## 3. 关键代码位置

钉钉登录相关：

- [app/api/auth/dingtalk/login/route.ts](/Users/chenxin/Desktop/LTC/app/api/auth/dingtalk/login/route.ts)
- [app/api/auth/dingtalk/callback/route.ts](/Users/chenxin/Desktop/LTC/app/api/auth/dingtalk/callback/route.ts)
- [lib/dingtalk.ts](/Users/chenxin/Desktop/LTC/lib/dingtalk.ts)
- [app/(auth)/login/page.tsx](/Users/chenxin/Desktop/LTC/app/(auth)/login/page.tsx)

Prisma 相关：

- [prisma/schema.prisma](/Users/chenxin/Desktop/LTC/prisma/schema.prisma)
- [prisma/migrations/20260414090000_add_auth_bindings/migration.sql](/Users/chenxin/Desktop/LTC/prisma/migrations/20260414090000_add_auth_bindings/migration.sql)

部署相关：

- [Dockerfile](/Users/chenxin/Desktop/LTC/Dockerfile)
- [.github/workflows/deploy.yml](/Users/chenxin/Desktop/LTC/.github/workflows/deploy.yml)
- [k8s/deployment.patch.yaml](/Users/chenxin/Desktop/LTC/k8s/deployment.patch.yaml)
- [k8s/ingress.patch.yaml](/Users/chenxin/Desktop/LTC/k8s/ingress.patch.yaml)

上下文记录：

- [CODEX_CONTEXT.md](/Users/chenxin/Desktop/LTC/CODEX_CONTEXT.md)

---

## 4. 线上部署结构

Kubernetes 部署背景：

- namespace：`ltc`
- 镜像：`registry.cn-hangzhou.aliyuncs.com/ssalcloud/ltc-app:latest`
- Deployment：`ltc`

CI/CD：

- GitHub Actions 自动构建镜像并推送
- SSH 到服务器执行：
  - `kubectl apply` Job 跑 `npx prisma migrate deploy` 的模板已写入 workflow
  - `kubectl rollout restart deployment ltc`

注意：

- 当前数据库是共用库，不能直接放心跑 Prisma 自动迁移
- workflow 里虽然补过 Prisma 步骤，但在这个项目里应非常谨慎使用

---

## 5. 数据库约束

### 5.1 当前数据库连接

Prisma 应连接：

```prisma
datasource db {
  provider = "mysql"
  url      = "mysql://qzmysql:i2aKzeFsNQlTckf0Grw@172.26.49.155:3306/ltc_db"
}
```

### 5.2 强约束

- 数据库已从 `default_db` 切换为 `ltc_db`
- 所有数据必须写入 `ltc_db`
- 不允许再使用 `default_db`
- 低代码数据库不可修改

### 5.3 Prisma 风险结论

这个项目的数据库不是一套“完全受 Prisma 独占管理”的开发库。

已确认：

- 本地 `prisma migrate dev --create-only` 会检测到 drift
- 数据库实际结构与 migration history 不一致
- 因此：
  - 不要直接执行 `prisma migrate dev`
  - 不要直接执行 `prisma migrate deploy`
  - 不要直接执行 `prisma db push`
  - 不要执行 `migrate reset`

如果要改表结构，优先：

- 手工 SQL
- 先评估是否会碰现有低代码业务表

---

## 6. auth_bindings 表的真实落地情况

钉钉登录需要一张新表：

- `auth_bindings`

Prisma schema 中原设计是：

- 新增 `auth_bindings`
- 外键 `auth_bindings.userId -> User.id`

但在实际数据库执行时：

- `CREATE TABLE auth_bindings` 成功
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` 失败
- 报错：
  - `ERROR 1022 (23000): Can't write; duplicate key in table ...`

### 当前建议结论

为了避免影响共用库：

- 可以接受 **无外键版本** 的 `auth_bindings`
- 即：
  - 保留表
  - 保留主键、唯一索引、普通索引
  - 不强行加外键

这意味着：

- 业务功能仍然可以跑
- 数据完整性由应用代码保证
- 数据库层不强约束 `userId -> User.id`

### 当前最小 SQL

```sql
USE `ltc_db`;

CREATE TABLE IF NOT EXISTS `auth_bindings` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `providerUserId` VARCHAR(191) NOT NULL,
  `unionId` VARCHAR(191) DEFAULT NULL,
  `openId` VARCHAR(191) DEFAULT NULL,
  `nick` VARCHAR(100) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_bindings_provider_providerUserId_key` (`provider`, `providerUserId`),
  KEY `auth_bindings_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 7. 钉钉登录排查历史结论

### 7.1 第一阶段问题：回调 404

现象：

- 钉钉授权后回调到：
  - `/api/auth/dingtalk/callback?...`
- 返回 404

结论：

- 源码里 callback 路由存在
- 但当时线上/构建产物未必是最新版本
- 本地构建验证后确认 callback 路由正常存在于构建产物中

### 7.2 第二阶段问题：`/api/auth/dingtalk/login` 返回 500

根因：

- K8s 环境未配置：
  - `DINGTALK_STATE_SECRET`
  - `DINGTALK_CLIENT_ID`
  - `DINGTALK_CLIENT_SECRET`
  - `DINGTALK_REDIRECT_URI`
  - `DINGTALK_SCOPE`

已修复：

- 在 K8s `ConfigMap` / `Secret` 中补齐 `DINGTALK_*`

### 7.3 第三阶段问题：钉钉失败后跳到了 localhost

现象：

- 线上失败后跳到：
  - `https://localhost:3000/login?...`

根因：

- callback 之前用：
  - `new URL("/login", req.url)`
- 代理环境下 `req.url` 基址可能变成容器内的 `localhost`

已修复：

- callback 跳转逻辑已改为优先读取显式站点 URL
- 生产环境兜底：
  - `https://ltc.ssalcloud.com`

### 7.4 第四阶段问题：用户信息接口失败

日志报错：

- `AuthenticationFailed.MissingParameter`
- `Missing parameters: x-acs-dingtalk-access-token`

根因：

- 获取钉钉用户信息时，错误使用了：
  - `Authorization: Bearer <accessToken>`
- 但钉钉要求：
  - `x-acs-dingtalk-access-token`

已修复：

```ts
headers: {
  "Content-Type": "application/json",
  "x-acs-dingtalk-access-token": accessToken,
  "Accept": "application/json"
}
```

### 7.5 当前状态

用户已反馈：

- “终于能钉钉登陆上了”

说明当前链路已经打通：

- 登录入口
- 钉钉授权
- 回调
- token 获取
- 用户信息获取
- 本地用户创建/绑定
- session 写入

---

## 8. 当前钉钉登录实现细节

### 8.1 授权地址

已改为：

- `https://login.dingtalk.com/oauth2/auth`

不是旧的：

- `https://login.dingtalk.com/oauth2/challenge.htm`

### 8.2 callback 支持参数

当前 callback 同时支持：

- `code`
- `authCode`
- `state`

### 8.3 默认角色

钉钉首次登录默认角色是：

- `VIEWER`

实现方式：

- 若不存在绑定用户
- 则创建本地用户
- `role = UserRole.VIEWER`
- 并尝试写入 `userRoles`

### 8.4 登录后默认行为

成功后：

- 写入 `ltc_session`
- 重定向到：
  - `/dashboard`

---

## 9. callback 调试日志能力

现在 callback 路由已增强日志，记录以下节点：

1. 进入 callback
2. 是否收到：
   - `code`
   - `authCode`
   - `state`
3. cookie 里的 state（脱敏）
4. state 校验结果
5. 是否开始 token 交换
6. token 交换成功/失败
7. 是否开始请求用户信息
8. 用户信息成功/失败
9. 是否查到 `AuthBinding`
10. 是否创建本地用户
11. 是否创建 `AuthBinding`
12. 是否写入 session
13. 最终跳转地址

细分错误码：

- `dingtalk_state_invalid`
- `dingtalk_token_failed`
- `dingtalk_userinfo_failed`
- `dingtalk_binding_failed`
- `dingtalk_session_failed`
- `dingtalk_oauth_failed`

线上日志查看：

```bash
kubectl -n ltc logs deployment/ltc --tail=200 -f
```

---

## 10. 线上环境变量要求

至少需要：

- `DINGTALK_CLIENT_ID`
- `DINGTALK_CLIENT_SECRET`
- `DINGTALK_REDIRECT_URI`
- `DINGTALK_SCOPE=openid`
- `DINGTALK_STATE_SECRET`
- `SESSION_SECRET`
- `NEXTAUTH_URL=https://ltc.ssalcloud.com`

注意：

- 这些配置属于部署环境
- 不应把生产密钥写进 git 仓库
- 应通过 K8s `ConfigMap` / `Secret` 注入

---

## 11. 已发生的重要 Git 提交

近期关键提交包括：

- `dfda24c` `Add DingTalk OAuth login and deploy flow`
- `d5e32f1` `Mark DingTalk auth routes as dynamic`
- `442dc78` `钉钉登陆修复`
- `fcb997a` `钉钉登陆修复2.0`

最新已推送到：

- `origin/main`

---

## 12. 给后续 GPT 的工作原则

后续如果再改这个项目，请遵守：

### 12.1 数据库方面

- 一律默认数据库是 `ltc_db`
- 不允许再把任何数据写到 `default_db`
- 默认不要执行 Prisma 自动迁移
- 默认不要执行 `db push`
- 默认不要执行 reset

### 12.2 钉钉登录方面

- 不要再改回旧的 `challenge.htm`
- 用户信息接口必须使用：
  - `x-acs-dingtalk-access-token`
- 线上站点地址一律视为：
  - `https://ltc.ssalcloud.com`
- 不允许任何线上逻辑回退到 `localhost`

### 12.3 部署方面

- 优先通过 CI/CD 发版
- 生产密钥只在 K8s 环境里维护
- 如果线上问题涉及 callback 或登录失败，先看 Pod 日志

---

## 13. 当前最重要的一句话结论

LTC 项目当前的钉钉登录链路已经基本打通；数据库必须使用 `ltc_db`，且当前共用库不适合让 Prisma 自动迁移，涉及新增结构时优先走手工 SQL 和最小影响原则。
