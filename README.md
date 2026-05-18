# FreeAi Web 前端菜单模块规划

FreeAi Web 是 `free-ai-go` 的管理端前端，用于配置和观察本地 AI Token 池、平台密钥、模型路由、额度健康、请求日志和运行指标。本文档先根据当前后端能力规划前端菜单模块，后续页面实现、接口服务和权限控制都应围绕这里的菜单边界推进。

## 后端依据

相邻后端工程：`../free-ai-go`

后端当前核心模块：

| 后端目录 | 能力 | 前端菜单归属 |
| --- | --- | --- |
| `routers/account_router.go` | AI 上游账号增删改查、启停、刷新、测试、排序 | 账号池 |
| `routers/platform_key_router.go` | 本地代理访问密钥增删改查、启停、限速、模型白名单 | 平台密钥 |
| `routers/model_router.go` | 对外模型到上游模型、Provider、账号组的映射 | 模型路由 |
| `routers/quota_router.go` | 账号额度列表、按账号查询、额度写入/更新 | 账号池、额度管理 |
| `routers/request_log_router.go` | 代理请求日志列表、详情、清理 | 请求日志 |
| `routers/ops_router.go` | 运行指标、统计、路由状态、账号健康、主密钥状态 | 工作台、运行监控、系统设置 |
| `routers/proxy_router.go` | OpenAI-compatible `/v1` 代理入口 | 不进入后台菜单，仅在接入指南展示 |
| `domains/audit_log.go` | 审计日志持久化 | 后端已有记录，前端菜单暂列为后续项 |

后端默认配置来自 `../free-ai-go/config.yaml`：

```yaml
system:
  app-name: "FreeAiGo"
  addr: 8787
  router-prefix: /api
freeai:
  proxy-prefix: /v1
  routing-strategy: weighted_round_robin
  cleanup-log-retention-days: 30
```

前端代理当前也指向 `http://127.0.0.1:8787/api/`，端口已与后端默认配置对齐。前端代码里继续使用 `/api` 作为管理接口前缀，业务客户端直接访问 `/v1` 代理入口。

## 菜单原则

- 菜单围绕“本地 AI 代理管理台”组织，不再沿用 Relay 控制台里的客户端、房间、流量、会员、订单语义。
- 一级菜单控制在 6 到 7 个，左侧导航保持可扫描；高频配置放前面，观察和系统项放后面。
- 所有会改变密钥、账号状态、额度、模型路由的操作必须二次确认，并在后端审计能力补齐后写入审计列表。
- 密钥和上游账号 Secret 只在创建时展示一次；列表和详情只展示 `keyPrefix`、`secretHint`。
- `/v1` 代理接口是业务接入面，不作为管理菜单页面；前端只提供接入说明和复制示例。

## 建议菜单结构

```text
工作台
账号池
  账号列表
  账号健康
  额度管理
平台密钥
  密钥列表
模型路由
  模型映射
  路由状态
请求日志
  日志列表
运行监控
  运行指标
  统计分析
系统设置
  接入指南
  安全设置
  数据保留
```

## 路由规划

| 菜单 | 前端路由 | 页面职责 | 后端接口 |
| --- | --- | --- | --- |
| 工作台 | `/dashboard` | 总览账号、可用账号、启用模型、启用密钥、最近请求、错误趋势 | `GET /api/ops/metrics`, `GET /api/ops/stats`, `GET /api/ops/account-health`, `GET /api/ops/master-key` |
| 账号列表 | `/accounts/list` | 账号池表格、增删改查、启停、刷新、测试、排序 | `GET /api/accounts`, `POST /api/accounts`, `PUT /api/accounts/:guid`, `DELETE /api/accounts/:guid`, `POST /api/accounts/:guid/enable`, `POST /api/accounts/:guid/disable`, `POST /api/accounts/:guid/refresh`, `POST /api/accounts/:guid/test`, `POST /api/accounts/reorder` |
| 账号详情 | `/accounts/:guid` | 账号基础信息、支持模型、额度、近期请求、失败状态 | `GET /api/accounts/:guid`, `GET /api/accounts/:guid/quotas`, `GET /api/request-logs?limit=200` |
| 账号健康 | `/accounts/health` | 账号状态矩阵、失败次数、冷却时间、订阅过期、额度概览 | `GET /api/ops/account-health` |
| 额度管理 | `/accounts/quotas` | 按账号/窗口查看额度，人工更新额度状态 | `GET /api/quotas`, `GET /api/accounts/:guid/quotas`, `POST /api/accounts/:guid/quotas` |
| 密钥列表 | `/platform-keys/list` | 本地代理访问密钥管理、限速、模型白名单 | `GET /api/platform-keys`, `POST /api/platform-keys`, `PUT /api/platform-keys/:guid`, `DELETE /api/platform-keys/:guid`, `POST /api/platform-keys/:guid/enable`, `POST /api/platform-keys/:guid/disable` |
| 模型映射 | `/models/list` | 对外模型、上游模型、Provider、账号组、超时、流式支持 | `GET /api/models`, `POST /api/models`, `PUT /api/models/:guid`, `DELETE /api/models/:guid`, `POST /api/models/:guid/enable`, `POST /api/models/:guid/disable` |
| 路由状态 | `/models/routes` | weighted round-robin 游标、最近命中账号、路由键 | `GET /api/ops/routes` |
| 日志列表 | `/request-logs/list` | 请求日志表格、详情抽屉、状态筛选、清理历史日志 | `GET /api/request-logs?limit=200`, `GET /api/request-logs/:guid`, `DELETE /api/request-logs?retentionDays=30` |
| 运行指标 | `/ops/metrics` | 服务健康、账号数量、可用账号、启用模型、启用密钥、主密钥状态 | `GET /api/ops/metrics`, `GET /api/ops/master-key`, `GET /api/healthz`, `GET /healthz` |
| 统计分析 | `/ops/stats` | 请求总量、成功数、失败数、成功率、平均延迟 | `GET /api/ops/stats` |
| 接入指南 | `/settings/integration` | 展示 `/v1/models`、`/v1/chat/completions`、`/v1/responses`、`/v1/embeddings` 接入方式 | `GET /v1/models`，代理请求由业务客户端调用 |
| 安全设置 | `/settings/security` | 主密钥状态、JWT、平台密钥策略、敏感字段展示规则 | `GET /api/ops/master-key`，其余配置当前以前端静态说明为主 |
| 数据保留 | `/settings/retention` | 请求日志保留天数、手动清理入口 | `DELETE /api/request-logs?before=...`, `DELETE /api/request-logs?retentionDays=...` |

## 当前后端接口清单

管理接口统一挂在 `/api` 下，前端 `HttpClient` 调用时不手写 `/api`，由 `environment.api.baseUrl` 和拦截器统一拼接。

后端管理接口使用 `nav-common-go-lib/response` 包装响应，前端拦截器会自动取出 `data`。因此 service 里声明返回类型时，按 `data` 的实际结构声明即可，不需要再包一层 `{ code, data, msg }`。

| 模块 | 方法 | 路径 | 前端用途 |
| --- | --- | --- | --- |
| 健康检查 | `GET` | `/healthz` | 服务裸健康检查 |
| 健康检查 | `GET` | `/api/healthz` | 管理 API 健康检查 |
| 账号池 | `GET` | `/api/accounts` | 账号列表 |
| 账号池 | `GET` | `/api/accounts/:guid` | 账号详情 |
| 账号池 | `POST` | `/api/accounts` | 新增账号 |
| 账号池 | `PUT` | `/api/accounts/:guid` | 编辑账号 |
| 账号池 | `DELETE` | `/api/accounts/:guid` | 删除账号 |
| 账号池 | `POST` | `/api/accounts/:guid/enable` | 启用账号 |
| 账号池 | `POST` | `/api/accounts/:guid/disable` | 禁用账号 |
| 账号池 | `POST` | `/api/accounts/:guid/refresh` | 刷新账号状态 |
| 账号池 | `POST` | `/api/accounts/:guid/test` | 测试账号可用性 |
| 账号池 | `POST` | `/api/accounts/reorder` | 调整优先级和权重 |
| 额度 | `GET` | `/api/quotas` | 全部额度列表，可带 `accountGuid` |
| 额度 | `GET` | `/api/accounts/:guid/quotas` | 单账号额度 |
| 额度 | `POST` | `/api/accounts/:guid/quotas` | 新增或更新账号额度 |
| 平台密钥 | `GET` | `/api/platform-keys` | 密钥列表 |
| 平台密钥 | `GET` | `/api/platform-keys/:guid` | 密钥详情 |
| 平台密钥 | `POST` | `/api/platform-keys` | 创建密钥，返回一次性明文 |
| 平台密钥 | `PUT` | `/api/platform-keys/:guid` | 编辑密钥策略 |
| 平台密钥 | `DELETE` | `/api/platform-keys/:guid` | 删除密钥 |
| 平台密钥 | `POST` | `/api/platform-keys/:guid/enable` | 启用密钥 |
| 平台密钥 | `POST` | `/api/platform-keys/:guid/disable` | 禁用密钥 |
| 模型路由 | `GET` | `/api/models` | 模型映射列表 |
| 模型路由 | `GET` | `/api/models/:guid` | 模型映射详情 |
| 模型路由 | `POST` | `/api/models` | 新增模型映射 |
| 模型路由 | `PUT` | `/api/models/:guid` | 编辑模型映射 |
| 模型路由 | `DELETE` | `/api/models/:guid` | 删除模型映射 |
| 模型路由 | `POST` | `/api/models/:guid/enable` | 启用模型映射 |
| 模型路由 | `POST` | `/api/models/:guid/disable` | 禁用模型映射 |
| 请求日志 | `GET` | `/api/request-logs?limit=200` | 请求日志列表 |
| 请求日志 | `GET` | `/api/request-logs/:guid` | 请求日志详情 |
| 请求日志 | `DELETE` | `/api/request-logs` | 清理日志，可带 `before` 或 `retentionDays` |
| 运维 | `GET` | `/api/ops/metrics` | 运行指标 |
| 运维 | `GET` | `/api/ops/stats` | 请求统计 |
| 运维 | `GET` | `/api/ops/routes` | 路由状态 |
| 运维 | `GET` | `/api/ops/account-health` | 账号健康 |
| 运维 | `GET` | `/api/ops/master-key` | 主密钥状态 |
| 代理入口 | `GET` | `/v1/models` | OpenAI-compatible 模型列表 |
| 代理入口 | `POST` | `/v1/chat/completions` | Chat Completions |
| 代理入口 | `POST` | `/v1/responses` | Responses |
| 代理入口 | `POST` | `/v1/embeddings` | Embeddings |

## 首页工作台

工作台是管理员进入后的第一屏，目标是回答三个问题：服务是否正常、账号池是否可用、最近代理质量如何。

建议模块：

- 顶部指标：服务状态、账号总数、可用账号数、启用模型数、启用密钥数。
- 账号健康：按 `available`、`limited`、`cooldown`、`exhausted`、`expired`、`invalid` 分组展示。
- 请求概览：今日请求量、成功率、平均延迟、首 Token 平均耗时、总 Token。
- 错误提醒：`auth_failed`、`rate_limited`、`quota_exhausted`、`upstream_5xx`、`network_error`。
- 快捷操作：新增账号、新增平台密钥、新增模型映射、查看请求日志。

优先接入接口：

```text
GET /api/ops/metrics
GET /api/ops/stats
GET /api/ops/account-health
GET /api/ops/master-key
```

`GET /api/ops/stats` 当前返回字段：

```ts
interface OpsStats {
  total: number;
  success: number;
  failures: number;
  avgLatencyMs: number;
}
```

`GET /api/ops/master-key` 当前返回字段：

```ts
interface MasterKeyStatus {
  path: string;
  exists: boolean;
  loaded: boolean;
  size: number;
  updatedAt: number;
  error?: string;
}
```

## 账号池模块

账号池是核心配置模块，管理可被路由选择的上游 AI 账号或 Token。

### 列表字段

| 字段 | 来源 | 展示建议 |
| --- | --- | --- |
| 名称 | `name` | 主列，可点击进入详情 |
| Provider | `provider` | 标签，如 `openai`、`azure`、`compatible` |
| 账号组 | `accountGroup` | 用于模型路由分组 |
| 类型 | `accountType` | 普通账号、团队账号、API Key 等 |
| 认证类型 | `authType` | `api_key` / `bearer_token` |
| Secret 提示 | `secretHint` | 只展示尾部提示，不展示明文 |
| 状态 | `status` + `enabled` | 彩色状态标签 |
| 优先级 | `priority` | 越小越靠前，支持排序 |
| 权重 | `weight` | weighted round-robin 使用 |
| 支持模型 | `supportedModels` | JSON 字符串，前端以标签或折叠 JSON 展示 |
| 最近使用 | `lastUsedAt` | 时间格式化 |
| 冷却到 | `cooldownUntil` | 冷却状态时重点展示 |
| 订阅过期 | `subscriptionExpiredAt` | 临近过期提醒 |
| 失败次数 | `failureCount` | 作为健康风险提示 |

### 表单字段

新增和编辑账号使用同一表单：

```ts
interface AccountForm {
  name: string;
  email?: string;
  provider: string;
  accountType?: string;
  authType: 'api_key' | 'bearer_token';
  secret?: string;
  supportedModels?: string;
  accountGroup?: string;
  priority?: number;
  weight?: number;
  subscriptionExpiredAt?: number;
  remark?: string;
}
```

表单规则：

- 新增账号时 `name`、`provider`、`secret` 必填。
- 编辑账号时 `secret` 选填；不填写表示保留原密钥。
- `weight` 默认为 `1`，不允许小于 `1`。
- `supportedModels` 暂按 JSON 字符串存储；前端可以先提供多行文本，后续再升级为标签编辑器。
- `authType` 默认 `bearer_token`，与后端逻辑一致。

### 操作

- 新增：`POST /api/accounts`
- 编辑：`PUT /api/accounts/:guid`
- 删除：`DELETE /api/accounts/:guid`
- 启用：`POST /api/accounts/:guid/enable`
- 禁用：`POST /api/accounts/:guid/disable`
- 刷新：`POST /api/accounts/:guid/refresh`
- 测试：`POST /api/accounts/:guid/test`
- 排序：`POST /api/accounts/reorder`

测试账号的请求体：

```ts
interface AccountTestInput {
  model?: string;
  prompt?: string;
}
```

测试结果要突出 `ok`、`upstreamStatusCode`、`upstreamErrorType`、`latencyMs`，失败时给出状态解释和下一步动作。

## 额度管理

额度既可以作为账号详情中的 Tab，也可以作为独立二级菜单。第一阶段建议两个入口复用同一组件：账号详情只看单账号额度，额度管理页面看全部账号额度。

字段：

| 字段 | 含义 |
| --- | --- |
| `accountGuid` | 所属账号 |
| `windowType` | 额度窗口，如 daily、monthly、subscription |
| `usedPercent` | 已用百分比 |
| `remainingTokens` | 剩余 Token |
| `totalTokens` | 总 Token |
| `resetAt` | 重置时间 |
| `nextRefreshAt` | 下次刷新时间 |
| `status` | `available` / `limited` / `exhausted` / `unknown` |

接口：

```text
GET /api/quotas
GET /api/quotas?accountGuid=:guid
GET /api/accounts/:guid/quotas
POST /api/accounts/:guid/quotas
```

前端状态色：

| 状态 | 展示 |
| --- | --- |
| `available` | 绿色 |
| `limited` | 橙色 |
| `exhausted` | 红色 |
| `unknown` | 灰色 |

## 平台密钥模块

平台密钥保护本地 `/v1` 代理入口，业务客户端使用 `Authorization: Bearer fmg_xxx` 访问代理 API。

### 列表字段

| 字段 | 来源 | 展示建议 |
| --- | --- | --- |
| 名称 | `name` | 主列 |
| Key 前缀 | `keyPrefix` | 只展示前缀 |
| 允许模型 | `allowedModels` | 空表示不限制；非空按标签展示 |
| 每分钟限速 | `rateLimitPerMinute` | `0` 表示不限速 |
| 启用 | `enabled` | 开关 |
| 最近使用 | `lastUsedAt` | 时间格式化 |
| 备注 | `remark` | 次要文本 |

创建接口会返回：

```ts
interface CreatePlatformKeyOutput {
  key: string;
  entity: PlatformKey;
}
```

前端必须用弹窗或结果页提示“密钥仅展示一次”，并提供复制按钮。离开弹窗后不再保存明文。

## 模型路由模块

模型路由决定外部请求里的 `model` 如何映射到具体 Provider、账号组和上游模型。

### 模型映射字段

| 字段 | 含义 |
| --- | --- |
| `publicModel` | 对外暴露的模型名，如 `gpt-4.1-mini` |
| `upstreamModel` | 上游实际模型名 |
| `provider` | 上游平台 |
| `accountGroup` | 账号组，和账号池里的 `accountGroup` 匹配 |
| `stream` | 是否支持流式 |
| `timeoutSec` | 请求超时 |
| `enabled` | 是否参与路由 |

接口：

```text
GET /api/models
GET /api/models/:guid
POST /api/models
PUT /api/models/:guid
DELETE /api/models/:guid
POST /api/models/:guid/enable
POST /api/models/:guid/disable
```

### 路由状态

`GET /api/ops/routes` 返回后端轮询状态：

| 字段 | 含义 |
| --- | --- |
| `routeKey` | Provider、账号组、模型和策略组成的路由键 |
| `lastAccountGuid` | 最近命中的账号 |
| `cursor` | 轮询游标 |
| `updatedAtUnix` | 更新时间 |

前端可以把路由状态与账号池数据做本地 join，把 `lastAccountGuid` 显示为账号名称。

## 请求日志模块

请求日志用于追踪 `/v1` 代理调用质量和路由切换原因。

列表字段：

| 字段 | 展示建议 |
| --- | --- |
| `requestId` | 可复制 |
| `platformKeyId` | 后续可 join 到密钥名称 |
| `model` / `upstreamModel` | 双行展示 |
| `provider` | 标签 |
| `accountGuid` | 后续可 join 到账号名称 |
| `statusCode` | HTTP 状态 |
| `errorType` | 错误分类 |
| `switched` / `switchCount` / `switchReason` | 路由切换说明 |
| `latencyMs` / `firstTokenMs` | 性能指标 |
| `inputTokens` / `outputTokens` | 用量 |
| `createdAtUnix` | 请求时间 |

接口：

```text
GET /api/request-logs?limit=200
GET /api/request-logs/:guid
DELETE /api/request-logs?retentionDays=30
DELETE /api/request-logs?before=1760000000000
GET /api/ops/stats
```

当前前端已接入请求日志列表、`ops/stats` 统计卡片、详情弹窗和按 `retentionDays` 清理。日志筛选第一阶段先在前端本地完成，因为后端当前只支持 `limit`。第二阶段建议后端补齐 `model`、`provider`、`accountGuid`、`errorType`、`statusCode`、时间范围分页查询。

## 运行监控模块

运行监控面向服务状态和路由质量，不承载复杂配置。

### 运行指标

接口：

```text
GET /api/ops/metrics
GET /api/ops/master-key
GET /api/healthz
GET /healthz
```

展示：

- 服务名和健康状态。
- 账号总数、可用账号数。
- 启用模型数。
- 启用平台密钥数。
- 主密钥文件是否存在、是否可加载、更新时间和错误信息。
- 后端当前版本、前端版本。

### 统计分析

接口：

```text
GET /api/ops/stats
```

当前后端已返回：

- `total`：请求日志总数。
- `success`：成功请求数。
- `failures`：失败请求数。
- `avgLatencyMs`：平均延迟。

前端第一阶段先展示总量、成功数、失败数、成功率和平均延迟。第二阶段如果后端继续扩展统计接口，再增加请求趋势、P95 延迟、首 Token 时间、Token 用量、Top 模型、Top Provider 和 Top 错误类型。

## 系统设置模块

系统设置不要过早做成可编辑配置中心。当前后端大部分运行配置来自 `config.yaml`，第一阶段以前端只读说明和安全提示为主。

### 接入指南

展示 OpenAI-compatible 客户端接入方式：

```bash
curl http://127.0.0.1:8787/v1/models \
  -H "Authorization: Bearer fmg_your_platform_key"
```

```bash
curl http://127.0.0.1:8787/v1/chat/completions \
  -H "Authorization: Bearer fmg_your_platform_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-public-model",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'
```

后端代理入口：

```text
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
POST /v1/embeddings
```

### 安全设置

第一阶段展示主密钥状态和当前安全边界：

```text
GET /api/ops/master-key
```

主密钥状态字段：

| 字段 | 含义 | 展示建议 |
| --- | --- | --- |
| `path` | 主密钥文件路径 | 只读文本 |
| `exists` | 文件是否存在 | 状态标签 |
| `loaded` | 是否成功加载 | 状态标签 |
| `size` | 文件大小 | 次要信息 |
| `updatedAt` | 更新时间 | 时间格式化 |
| `error` | 加载错误 | 仅失败时展示 |
 
安全边界：

- 管理 API 走 `/api`，默认注册在后端 private group，沿用 `nav-common-go-lib` 鉴权。
- 代理 API 走 `/v1`，使用平台密钥鉴权。
- 上游账号 Secret 后端加密存储，前端不展示明文。
- 平台密钥只在创建时返回明文。

### 数据保留

当前后端配置：

```yaml
freeai:
  cleanup-log-retention-days: 30
```

前端第一阶段提供：

- 当前保留策略说明。
- 清理 30 天前日志按钮。
- 按指定时间清理日志按钮。

## 权限与鉴权

前端已经使用 `@delon/auth` 和 `@delon/acl`：

- `src/app/routes/routes.ts` 的主布局已接入 `authSimpleCanActivate`、`authSimpleCanActivateChild`。
- `src/app/core/startup/startup.service.ts` 当前请求 `/user` 获取用户信息。
- `src/app/core/net/default.interceptor.ts` 会把相对请求统一加上 `environment.api.baseUrl`，开发环境为 `/api`。

需要对齐的点：

1. 确认 `nav-common-go-lib` 当前登录、注册、当前用户接口路径。
2. 将登录页里的 `/secret/encrypt`、`/login/in`、`/register` 与后端实际接口统一。
3. 将启动用户接口 `/user` 改成后端真实的当前用户接口。
4. 给菜单项增加 ACL 标记，例如 `admin` 可管理密钥和账号，`viewer` 只读监控与日志。

建议角色：

| 角色 | 能力 |
| --- | --- |
| `SUPER_ADMIN` | 全部菜单和全部写操作 |
| `ADMIN` | 除系统安全外的配置和观察 |
| `VIEWER` | 工作台、请求日志、运行监控只读 |

## 前端实现建议

当前前端是 Angular 21 + ng-alain + NG-ZORRO：

- 菜单组件：`src/app/layout/basic/widgets/menus.ts`
- 顶层路由：`src/app/routes/routes.ts`
- 启动服务：`src/app/core/startup/startup.service.ts`
- HTTP 拦截：`src/app/core/net/default.interceptor.ts`
- 代理配置：`proxy.conf.js`

建议模块目录：

```text
src/app/routes/dashboard/
src/app/routes/accounts/
src/app/routes/platform-keys/
src/app/routes/models/
src/app/routes/request-logs/
src/app/routes/ops/
src/app/routes/settings/
```

建议每个业务模块保持同样结构：

```text
routes.ts
<module>.service.ts
<module>.model.ts
list/<module>-list.component.ts
detail/<module>-detail.component.ts
form/<module>-form.component.ts
```

模块内文件保持扁平，避免再拆 `services/` 和 `models/` 子目录；页面组件仍按 `list/`、`detail/`、`edit/` 这类视图目录组织。

## 菜单组件目标形态

`src/app/layout/basic/widgets/menus.ts` 建议替换为 FreeAi 菜单：

```text
工作台                    /dashboard
账号池                    /accounts/list
  账号列表                /accounts/list
  账号健康                /accounts/health
  额度管理                /accounts/quotas
平台密钥                  /platform-keys/list
模型路由                  /models/list
  模型映射                /models/list
  路由状态                /models/routes
请求日志                  /request-logs/list
运行监控                  /ops/metrics
  运行指标                /ops/metrics
  统计分析                /ops/stats
系统设置                  /settings/integration
  接入指南                /settings/integration
  安全设置                /settings/security
  数据保留                /settings/retention
```

推荐图标：

| 菜单 | NG-ZORRO 图标 |
| --- | --- |
| 工作台 | `dashboard` |
| 账号池 | `database` |
| 平台密钥 | `key` |
| 模型路由 | `branches` |
| 请求日志 | `profile` |
| 运行监控 | `monitor` |
| 系统设置 | `setting` |

## 接口服务命名

建议统一使用后端资源名：

| 服务 | 文件 | 职责 |
| --- | --- | --- |
| `AccountsService` | `accounts.service.ts` | 账号 CRUD、启停、刷新、测试、排序 |
| `QuotasService` | `quotas.service.ts` | 额度列表和更新 |
| `PlatformKeysService` | `platform-keys.service.ts` | 平台密钥 CRUD、启停 |
| `ModelsService` | `models.service.ts` | 模型映射 CRUD、启停 |
| `RequestLogsService` | `request-logs.service.ts` | 请求日志列表、详情、清理 |
| `OpsService` | `ops.service.ts` | metrics、stats、routes、account-health |

接口路径不要再写 `/api` 前缀，保持 `HttpClient` 调用 `/accounts`、`/models` 等相对路径，由拦截器自动拼接 `environment.api.baseUrl`。

## 当前前后端差异

端口已经统一：后端 `system.addr` 和前端 `proxy.conf.js` 都使用 `8787`。当前仍需要尽快处理的差异：

| 类型 | 当前前端 | 当前后端 | 建议 |
| --- | --- | --- | --- |
| 产品名 | `Recodex Relay` | `FreeAiGo` | 全局替换为 `FreeAi` / `FreeAiGo` |
| 菜单语义 | 客户端、房间、流量、会员、订单 | 账号、密钥、模型、额度、日志 | 替换菜单和路由模块 |
| 账号 API | `/clients/list` 等 Relay API | `/accounts` | 重写前端 service |
| 运维 API | `/api/metrics`、`/api/audit/list` | `/api/ops/metrics`、`/api/ops/stats` | 改成实际后端路径 |
| 安全状态 | 前端暂无页面 | `/ops/master-key` | 在系统设置/安全设置展示主密钥状态 |
| 审计接口 | 前端已有菜单设想 | 后端只有写入服务，无查询 API | 暂不放一级菜单，后端补接口后再开放 |
| 会员订单 | 前端已有占位 | 后端无会员/订单模块 | 删除或隐藏 |
| 登录用户 | `/user` | 依赖 common lib，待确认 | 对齐 common lib 实际接口 |

## 实施优先级

### P0：菜单和可运行骨架

- 修改左侧菜单为 FreeAi 菜单。
- 调整顶层路由，删除 Relay 语义入口。
- 新增各模块占位页，显示后端接口和下一步。
- 修正产品标题、Logo 文案和启动页文案。
- 系统设置页展示 `ops/master-key` 主密钥状态。

### P1：核心配置闭环

- 账号池列表、新增、编辑、启停、测试。
- 平台密钥列表、新增、启停、复制一次性密钥。
- 模型映射列表、新增、编辑、启停。
- 工作台接入 `ops/metrics`。

### P2：观察与诊断

- 请求日志列表和详情。
- 账号健康页面。
- 路由状态页面。
- 统计分析页面。

### P3：增强能力

- 额度管理编辑。
- 日志清理策略 UI。
- 审计日志查询接口和页面。
- 更细的 ACL 权限。
- 账号和日志的服务端分页筛选。

## 本地开发

安装依赖：

```bash
pnpm install
```

启动前端：

```bash
pnpm start
```

启动后端：

```bash
cd ../free-ai-go
go run .
```

联调检查：

```bash
curl http://127.0.0.1:8787/healthz
curl http://127.0.0.1:8787/api/healthz
curl http://127.0.0.1:8787/api/ops/metrics
curl http://127.0.0.1:8787/api/ops/master-key
```

前端请求约定：

- 管理接口写成 `/accounts`、`/models`、`/ops/metrics`。
- 拦截器会拼成 `/api/accounts`、`/api/models`、`/api/ops/metrics`。
- 业务客户端调用 `/v1` 时不经过前端管理 API。

## 验收清单

- 左侧菜单不再出现 Relay、房间、客户端、会员、订单等旧模块。
- 所有菜单路由刷新后能正常进入，不落到 404。
- 工作台能展示 `FreeAiGo` 服务状态。
- 账号、密钥、模型三个核心模块都能完成列表查询。
- Secret 和平台密钥明文不会出现在列表、详情或日志里。
- 删除、禁用、清理日志等危险操作都有二次确认。
- 请求失败时使用统一错误提示，并能看到后端返回的 `msg`。
- README 中列出的 API 与 `../free-ai-go/routers` 保持一致。
