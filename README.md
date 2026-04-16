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

## 业务说明

- 线索转商机使用数据库事务
- 商机转项目使用数据库事务
- 合同未生效前不得创建回款
- 成本必须归属项目
- 回款必须归属合同
- 项目毛利 = 已生效合同金额合计 - 成本金额合计
- 所有关键操作会写入审计日志
