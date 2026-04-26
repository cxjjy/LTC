# LTC 项目管理系统

本项目是一个本地可运行的 LTC 项目管理系统，覆盖以下完整业务闭环：

`线索 Lead -> 商机 Opportunity -> 项目 Project -> 合同 Contract -> 交付 Delivery -> 成本 Cost -> 回款 Receivable`

技术栈：

- Next.js 14 + TypeScript + App Router
- Tailwind CSS + shadcn/ui 风格基础组件
- Prisma + MySQL
- Zod + React Hook Form
- TanStack Table

## 目录结构

```text
app/
components/
lib/
modules/
prisma/
types/
tests/
```

## 主要特性

- 全业务链路数据闭环
- 上下游链路可追溯
- 转换动作和状态变更写入审计日志
- 服务端 RBAC 权限控制
- 默认软删除
- 本地 MySQL 直连开发，无 Docker

## 环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

示例：

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/ltc"
SESSION_SECRET="ltc-local-dev-secret"
DINGTALK_CLIENT_ID=""
DINGTALK_CLIENT_SECRET=""
DINGTALK_REDIRECT_URI="https://ltc.ssalcloud.com/api/auth/dingtalk/callback"
DINGTALK_AUTH_BASE="https://login.dingtalk.com/oauth2/auth"
DINGTALK_SCOPE="openid"
DINGTALK_STATE_SECRET=""
```

## 本地 MySQL 初始化

先确保本地已安装并启动 MySQL，然后执行：

```sql
CREATE DATABASE ltc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 安装与启动

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

启动后访问：

`http://localhost:3000`

## Node 运行时说明

这个项目当前采用一套经过本机验证的“双 Node”稳定方案：

- 应用运行：`Next.js 14` 使用 `Node 20`
- 样式编译：`Tailwind / globals.css` 预编译使用 `Node 22`

原因：

- 在这台开发机上，`Next.js 14` 用 `Node 22` 运行时更容易出现“服务进程存在但页面一直转圈”的问题
- 同一台机器上，`Tailwind CSS` 用 `Node 20` 编译 `app/globals.css` 会卡住，但用系统 `Node 22` 可以正常完成

当前仓库已经内置这套处理：

- `.nvmrc` 固定开发运行时为 `20`
- `scripts/check-node-version.mjs` 会在 `dev / build / start` 前校验当前 Node 版本
- `scripts/build-styles.mjs` 会使用系统 `Node 22` 预编译 `app/globals.css`
- 生成文件为 `app/generated-tailwind.css`
- `app/layout.tsx` 运行时直接加载 `generated-tailwind.css`

因此推荐启动方式就是直接执行：

```bash
npm run dev
```

如果本机没有可用的 `Node 22`，样式预编译会失败。当前脚本优先查找：

- `/usr/local/bin/node`
- 当前进程 `process.execPath`

说明：

- `app/generated-tailwind.css` 是构建产物，但当前被纳入仓库管理，用于保证样式链稳定
- 不要手工编辑 `app/generated-tailwind.css`，应修改 `app/globals.css` 后重新执行 `npm run dev`、`npm run build` 或 `npm run start`

## Prisma 常用命令

生成客户端：

```bash
npx prisma generate
```

执行迁移：

```bash
npx prisma migrate dev --name init
```

执行种子数据：

```bash
npm run seed
```

## 默认账号密码

所有账号默认密码均为：`123456`

- `admin`
- `sales`
- `pm`
- `delivery`
- `finance`

## 钉钉登录接入

系统已预留钉钉网页登录入口，保留原有账号密码登录方式不变。

部署前请补齐以下环境变量：

```env
DINGTALK_CLIENT_ID="dingrwonqkyjz5xcgrlp"
DINGTALK_CLIENT_SECRET="你的钉钉 AppSecret"
DINGTALK_REDIRECT_URI="https://ltc.ssalcloud.com/api/auth/dingtalk/callback"
DINGTALK_SCOPE="openid"
DINGTALK_STATE_SECRET="一个随机长字符串"
```

说明：

- 首次钉钉登录会自动创建本地用户
- 自动创建的用户默认角色为 `VIEWER`
- 自动创建用户的密码占位值为 `DINGTALK_LOGIN_ONLY`
- 回调地址必须与钉钉开放平台后台配置保持一致
- 建议使用 HTTPS 公网地址完成授权回调

## 测试

运行基础测试：

```bash
npm test
```

当前测试覆盖：

- 线索转商机
- 商机转项目
- 合同生效后创建回款
- 项目毛利计算

## 运行问题排查

如果本地出现“服务已启动但浏览器一直转圈”或“登录后页面无样式”，优先按下面顺序排查：

1. 确认运行 Next 的 Node 版本是 `20.x`
2. 确认系统 `Node 22` 仍可用，执行 `/usr/local/bin/node -v`
3. 重新启动服务，让 `predev` 或 `prestart` 重新生成 `app/generated-tailwind.css`
4. 若页面样式异常，优先看 HTML 是否已经加载 `/_next/static/css/app/layout.css`
5. 不要切回自定义 dev server，当前正式脚本是 `next dev -H 127.0.0.1 -p 3000`

## 业务说明

- 线索转商机使用数据库事务
- 商机转项目使用数据库事务
- 合同未生效前不得创建回款
- 成本必须归属项目
- 回款必须归属合同
- 项目毛利 = 已生效合同金额合计 - 成本金额合计
- 所有关键操作会写入审计日志
