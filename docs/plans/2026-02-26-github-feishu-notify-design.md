# GitHub Feishu Notify - Design

## Overview

Lightweight TypeScript service that receives GitHub Webhook events and sends personal notifications to subscribers via Feishu App Bot.

## Architecture

```
GitHub Repo A ──Webhook──┐
GitHub Repo B ──Webhook──┤     ┌─────────────┐     ┌──────────────────┐
GitHub Repo C ──Webhook──┼────▶│  Express 服务 │────▶│ 飞书应用机器人 API │
                         ┘     │  (解析+格式化) │     │ (私信通知)        │
                               └─────────────┘     └──────────────────┘
```

### Core Flow

1. GitHub sends Webhook event to Express service
2. Service verifies signature (GitHub Secret), parses event type and payload
3. Looks up repo subscribers from config
4. Maps GitHub usernames to Feishu open_ids
5. Formats event as Feishu interactive card
6. Sends personal message to each subscriber via Feishu Open API

### Routes

- `POST /webhook/github` — receive all GitHub events
- `GET /health` — health check

## Supported Events

| Event | Actions | Notification Content |
|-------|---------|---------------------|
| `issues` | opened, closed, reopened | Title, author, labels, link |
| `issue_comment` | created | Issue title, commenter, comment summary |
| `pull_request` | opened, closed, merged, reopened | Title, author, branch, link |
| `pull_request_review` | submitted | PR title, reviewer, result |
| `push` | — | Pusher, branch, commit list summary |

## Feishu Message Format

Interactive cards with color-coded headers:
- Issue opened → green
- Issue closed → purple
- PR opened → blue
- PR merged → purple
- PR review → yellow
- Push → grey

## Configuration

```yaml
server:
  port: 3000

github:
  webhookSecret: "your-github-webhook-secret"

feishu:
  appId: "cli_xxxxx"
  appSecret: "xxxxx"

userMapping:
  octocat: "ou_xxxx"
  dev-alice: "ou_yyyy"

routes:
  - repo: "org/repo-a"
    subscribers: ["octocat", "dev-alice"]
    events: ["issues", "pull_request", "push"]
  - repo: "org/repo-b"
    subscribers: ["octocat"]
```

## Project Structure

```
github-feishu-notify/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── routes/
│   │   └── github.ts
│   ├── handlers/
│   │   ├── issues.ts
│   │   ├── issue-comment.ts
│   │   ├── pull-request.ts
│   │   ├── pr-review.ts
│   │   └── push.ts
│   ├── feishu/
│   │   ├── client.ts
│   │   ├── sender.ts
│   │   └── card.ts
│   └── notify.ts
├── config.yaml
├── .env.example
├── Dockerfile
├── docker-compose.yaml
├── package.json
└── tsconfig.json
```

## Tech Stack

- Express — HTTP server
- js-yaml — config parsing
- TypeScript + tsx — dev runtime

## Decisions

- **Feishu App Bot** over custom webhook bot — supports sending to individuals
- **Config file user mapping** — simple manual mapping of GitHub username → Feishu open_id
- **Repo subscriber model** — notify all subscribers of a repo, not event-specific recipients
- **No database** — stateless, no persistence needed
- **Docker deployment** — single container
