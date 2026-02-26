# GitHub Feishu Notify

轻量级 GitHub 事件通知服务 —— 接收 GitHub Webhook，通过飞书应用机器人将事件以互动卡片的形式私信推送给订阅者。

## 功能特性

- 支持 5 种 GitHub 事件：Issues、Issue 评论、Pull Request、PR Review、Push
- 飞书互动卡片消息，不同事件类型有不同颜色标识
- 多仓库监听，每个仓库可配置不同的订阅者和事件过滤
- GitHub Webhook 签名验证（HMAC SHA-256）
- 飞书 Token 自动缓存与刷新
- Docker 一键部署

## 支持的事件

| GitHub 事件 | 触发动作 | 卡片颜色 |
|---|---|---|
| Issues | opened, closed, reopened | 🟢 绿 / 🟣 紫 / 🔵 蓝 |
| Issue Comment | created | 🔵 蓝 |
| Pull Request | opened, closed, merged, reopened | 🔵 蓝 / ⚪ 灰 / 🟣 紫 |
| PR Review | submitted (approved / changes_requested / commented) | 🟢 绿 / 🔴 红 / 🟡 黄 |
| Push | — | ⚪ 灰 |

## 快速开始

### 前置条件

1. **飞书应用** — 需要在飞书开放平台创建一个应用
2. **服务器** — 一台有公网 IP 的服务器（GitHub 需要能访问到你的 Webhook 地址）

### 第一步：创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)，点击「创建自建应用」
2. 填写应用名称（如 `GitHub Notify`），创建完成后进入应用
3. 记录 **App ID** 和 **App Secret**（在「凭证与基础信息」页面）
4. 进入「权限管理」，搜索并开通以下权限：
   - `im:message:send_v1` — 发送消息
5. 进入「版本管理与发布」，创建版本并发布应用
6. 让管理员在飞书管理后台审批通过该应用

### 第二步：获取用户的飞书 Open ID

你需要知道每个接收通知的用户的飞书 Open ID（格式为 `ou_xxxx`）。

获取方式：
- **飞书管理后台** → 组织架构 → 点击用户 → 查看 Open ID
- **飞书 API**：调用 [获取用户信息](https://open.feishu.cn/document/server-docs/contact-v3/user/get) 接口，通过邮箱或手机号查询

### 第三步：部署服务

#### 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone https://github.com/wyuc/github-feishu-notify.git
cd github-feishu-notify

# 创建配置文件
cp config.example.yaml config.yaml
```

编辑 `config.yaml`（见下方配置说明），然后启动：

```bash
docker compose up -d
```

验证服务是否运行：

```bash
curl http://localhost:3000/health
# 返回 {"status":"ok"}
```

#### 使用 Node.js 直接运行

```bash
git clone https://github.com/wyuc/github-feishu-notify.git
cd github-feishu-notify
npm install

# 创建配置文件
cp config.example.yaml config.yaml
# 编辑 config.yaml ...

# 开发模式（自动重启）
npm run dev

# 或者编译后运行
npm run build
npm start
```

### 第四步：配置 GitHub Webhook

1. 进入你的 GitHub 仓库 → **Settings** → **Webhooks** → **Add webhook**
2. 填写配置：
   - **Payload URL**: `http://你的服务器地址:3000/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: 与 `config.yaml` 中 `github.webhookSecret` 一致
   - **Which events**: 选择 **Let me select individual events**，勾选：
     - Issues
     - Issue comments
     - Pull requests
     - Pull request reviews
     - Pushes
3. 点击 **Add webhook**

GitHub 会发送一个 ping 事件来测试连接。如果看到绿色勾表示连接成功。

> 如果需要监听多个仓库，在每个仓库中重复上述步骤，使用相同的 Payload URL 和 Secret。

## 配置说明

```yaml
server:
  port: 3000                    # 服务端口

github:
  webhookSecret: "your-secret"  # GitHub Webhook Secret，用于签名验证

feishu:
  appId: "cli_xxxxx"            # 飞书应用 App ID
  appSecret: "xxxxx"            # 飞书应用 App Secret

# GitHub 用户名 → 飞书 Open ID 映射
userMapping:
  octocat: "ou_xxxx"            # key 是 GitHub 用户名, value 是飞书 Open ID
  dev-alice: "ou_yyyy"

# 仓库订阅路由
routes:
  - repo: "org/repo-a"                   # 仓库全名 (owner/repo)
    subscribers: ["octocat", "dev-alice"] # 订阅者列表（使用 GitHub 用户名）
    events:                               # 可选：指定监听的事件类型
      - "issues"
      - "issue_comment"
      - "pull_request"
      - "pull_request_review"
      - "push"

  - repo: "org/repo-b"
    subscribers: ["octocat"]
    # 不指定 events 则监听所有支持的事件
```

### 环境变量覆盖

配置文件中的敏感信息可以通过环境变量覆盖：

| 环境变量 | 对应配置项 |
|---|---|
| `PORT` | `server.port` |
| `GITHUB_WEBHOOK_SECRET` | `github.webhookSecret` |
| `FEISHU_APP_ID` | `feishu.appId` |
| `FEISHU_APP_SECRET` | `feishu.appSecret` |
| `CONFIG_PATH` | 配置文件路径（默认 `config.yaml`） |

使用 Docker Compose 时可以在 `docker-compose.yaml` 的 `environment` 中设置：

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./config.yaml:/app/config.yaml:ro
    environment:
      - GITHUB_WEBHOOK_SECRET=your-secret
      - FEISHU_APP_ID=cli_xxxxx
      - FEISHU_APP_SECRET=xxxxx
    restart: unless-stopped
```

## 消息效果示例

收到通知后，飞书中会显示类似这样的互动卡片：

```
┌─ 🔵 PR opened: Fix login validation ────────┐
│                                               │
│  Repo          Author                         │
│  org/repo-a    @octocat                       │
│                                               │
│  Branch        #                              │
│  fix/login → main   #42                       │
│                                               │
│  ┌──────────┐                                 │
│  │ 查看详情  │                                 │
│  └──────────┘                                 │
└───────────────────────────────────────────────┘
```

## 常见问题

### GitHub Webhook 显示连接失败？

- 确保服务器的 3000 端口对公网开放
- 如果使用了反向代理（如 Nginx），确保正确转发到 3000 端口
- 检查服务是否正常运行：`curl http://localhost:3000/health`

### 飞书消息发送失败？

- 确认应用已发布并审批通过
- 确认 `im:message:send_v1` 权限已开通
- 确认应用对目标用户有发送消息的权限（用户需要在应用的可用范围内）
- 检查 Open ID 是否正确（格式为 `ou_` 开头）

### 如何让应用能给用户发消息？

飞书应用机器人只能给**应用可用范围内的用户**发送消息。设置方式：

1. 进入飞书开放平台 → 你的应用 → **可用范围**
2. 添加需要接收通知的用户或部门
3. 或者设置为「全部员工」

### 如何调试？

查看 Docker 日志：

```bash
docker compose logs -f
```

日志中会输出每个事件的接收和发送情况：

```
Received event: pull_request from org/repo-a
Message sent to ou_xxxx
Notified 2 subscribers for pull_request on org/repo-a
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（文件修改后自动重启）
npm run dev

# 编译
npm run build

# 运行编译后的代码
npm start
```

## License

MIT
