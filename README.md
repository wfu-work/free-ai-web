# FreeAI Web

FreeAI Web 是 FreeAiGo OAuth 账号池的管理界面。它只管理 ChatGPT/Codex OAuth 账号文件，不提供上游 OpenAI Platform API Key、裸 Bearer Token、登录回调或自定义中转站配置。

下游平台密钥仍然保留，用于让本地工具和团队客户端安全访问 FreeAiGo 的 `/v1` 网关。

## 当前功能

- OAuth 账号 JSON 的本地结构校验和导入。
- 账号启停、分组、优先级、权重和官方模型同步。
- 敏感账号文件导出确认。
- 从官方 Codex 接口获取模型清单。
- 手动触发 wham 额度与订阅同步。
- 主动发送最小 Codex 请求并采样额度响应头。
- 展示 5 小时、7 天及附加额度窗口的已用比例、重置时间和来源。
- 展示套餐、订阅到期/续费、Token 状态、错误和冷却状态。
- 平台密钥、模型目录、账号池路由、请求日志和运行监控。
- `/v1/models`、`/v1/chat/completions`、`/v1/responses` 接入示例和浏览器调试。

## 账号导入

在“账号池 → 导入账号”中选择 Codex/ChatGPT OAuth JSON。浏览器只做字段形状校验，文件随后发送给后端加密保存。

文件至少应包含：

```json
{
  "tokens": {
    "access_token": "<oauth-access-token>",
    "account_id": "<chatgpt-account-id>"
  },
  "meta": {
    "label": "name@example.com"
  }
}
```

实际文件通常还包含 `id_token` 和 `refresh_token`。不要截图、粘贴或提交真实令牌。相同 ChatGPT Account ID 再次导入会更新已有账号。

账号导入后可执行：

1. “同步官方模型”将该账号支持的 Codex 模型写入统一模型目录。
2. “同步额度与订阅”查询 wham、accounts/check 和 subscriptions。
3. “主动额度探测”发送一个极小 Responses 请求并记录额度响应头。
4. 在账号列表检查窗口、重置时间、订阅和 Token 状态。

## 额度展示

界面中的 `usedPercent` 是窗口已使用百分比，不是精确 Token 余额。来源标签含义：

| 来源 | 含义 |
| --- | --- |
| `wham` | `/backend-api/wham/usage` 主动同步 |
| `response_header` | 正常 Codex 请求的 `x-codex-*` 响应头 |
| `active_probe` | 管理员主动最小请求探测的响应头 |

界面不允许手工修改账号额度，避免用伪数据影响调度。

## 主要管理接口

前端请求会通过开发代理或同源部署访问 `/api`：

```text
POST /api/accounts/import
GET  /api/accounts/list
GET  /api/accounts/:guid/export
POST /api/accounts/:guid/refresh-usage
POST /api/accounts/:guid/probe
POST /api/accounts/fetch-models
POST /api/models/sync
GET  /api/models/:guid/accounts
GET  /api/ops/account-health
```

下游业务客户端直接访问：

```text
GET  /v1/models
POST /v1/chat/completions
POST /v1/responses
```

## 本地开发

安装依赖并启动：

```bash
pnpm install
pnpm start
```

生产构建：

```bash
pnpm run build
```

构建输出位于 `dist/freeai-web/browser`。发布后端时，需要把该目录压缩为 `../free-ai-go/webs/freeai-web.zip`。

## 安全提示

- 导出文件包含 Access Token 和 Refresh Token，只保存到可信位置。
- 前端不得把完整账号文件、令牌或导出内容写入日志和错误提示。
- 平台密钥只在创建时展示一次；它是下游网关密钥，不是上游账号凭据。
- 主密钥状态页只展示路径和加载状态，不展示密钥内容。
