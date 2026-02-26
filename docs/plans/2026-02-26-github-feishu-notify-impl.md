# GitHub Feishu Notify Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight TypeScript service that receives GitHub Webhook events and sends personal notifications via Feishu App Bot.

**Architecture:** Express HTTP server receives GitHub webhooks on `POST /webhook/github`, verifies signature, resolves subscribers from YAML config, formats events as Feishu interactive cards, and sends via Feishu Open API.

**Tech Stack:** TypeScript, Express, js-yaml, tsx (dev runner), Docker

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `config.example.yaml`

**Step 1: Initialize package.json**

```bash
cd /Users/wyuc/Documents/Code/github-feishu-notify
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express js-yaml
npm install -D typescript @types/express @types/node @types/js-yaml tsx
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
config.yaml
.env
```

**Step 5: Create .env.example**

```env
# Optional: override config.yaml values via env vars
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=xxxxx
PORT=3000
```

**Step 6: Create config.example.yaml**

```yaml
server:
  port: 3000

github:
  webhookSecret: "your-github-webhook-secret"

feishu:
  appId: "cli_xxxxx"
  appSecret: "xxxxx"

userMapping:
  # github_username: feishu_open_id
  octocat: "ou_xxxx"
  dev-alice: "ou_yyyy"

routes:
  - repo: "org/repo-a"
    subscribers: ["octocat", "dev-alice"]
    events: ["issues", "issue_comment", "pull_request", "pull_request_review", "push"]
  - repo: "org/repo-b"
    subscribers: ["octocat"]
    # omit events to subscribe to all
```

**Step 7: Update package.json scripts**

Add to package.json:
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 8: Commit**

```bash
git add package.json tsconfig.json .gitignore .env.example config.example.yaml package-lock.json
git commit -m "chore: project scaffolding with dependencies"
```

---

### Task 2: Config Loading

**Files:**
- Create: `src/config.ts`

**Step 1: Create src/config.ts**

```typescript
import { readFileSync, existsSync } from "fs";
import { load } from "js-yaml";

interface RouteConfig {
  repo: string;
  subscribers: string[];
  events?: string[];
}

interface Config {
  server: { port: number };
  github: { webhookSecret: string };
  feishu: { appId: string; appSecret: string };
  userMapping: Record<string, string>;
  routes: RouteConfig[];
}

const DEFAULT_EVENTS = [
  "issues",
  "issue_comment",
  "pull_request",
  "pull_request_review",
  "push",
];

function loadConfig(): Config {
  const configPath = process.env.CONFIG_PATH || "config.yaml";

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}. Copy config.example.yaml to config.yaml and edit it.`
    );
  }

  const raw = load(readFileSync(configPath, "utf-8")) as Config;

  // Allow env var overrides
  const config: Config = {
    server: {
      port: parseInt(process.env.PORT || String(raw.server?.port || 3000)),
    },
    github: {
      webhookSecret:
        process.env.GITHUB_WEBHOOK_SECRET || raw.github?.webhookSecret || "",
    },
    feishu: {
      appId: process.env.FEISHU_APP_ID || raw.feishu?.appId || "",
      appSecret: process.env.FEISHU_APP_SECRET || raw.feishu?.appSecret || "",
    },
    userMapping: raw.userMapping || {},
    routes: (raw.routes || []).map((r) => ({
      ...r,
      events: r.events || DEFAULT_EVENTS,
    })),
  };

  return config;
}

export const config = loadConfig();
export type { Config, RouteConfig };
```

**Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add YAML config loading with env var overrides"
```

---

### Task 3: GitHub Webhook Signature Verification

**Files:**
- Create: `src/routes/github.ts`

**Step 1: Create src/routes/github.ts**

This file handles the webhook route, verifies the GitHub signature, and dispatches to the appropriate handler.

```typescript
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { handleEvent } from "../notify.js";

const router = Router();

function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!config.github.webhookSecret) return true; // skip if no secret configured
  if (!signature) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", config.github.webhookSecret)
      .update(payload)
      .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

router.post("/webhook/github", (req: Request, res: Response) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const event = req.headers["x-github-event"] as string;
  const rawBody = (req as any).rawBody as string;

  if (!verifySignature(rawBody, signature)) {
    console.warn("Invalid signature, rejecting request");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  if (!event) {
    res.status(400).json({ error: "Missing X-GitHub-Event header" });
    return;
  }

  const payload = req.body;
  const repo = payload.repository?.full_name;

  console.log(`Received event: ${event} from ${repo}`);

  // Process async, respond immediately
  handleEvent(event, payload).catch((err) => {
    console.error("Error handling event:", err);
  });

  res.status(200).json({ ok: true });
});

export { router as githubRouter };
```

**Step 2: Commit**

```bash
git add src/routes/github.ts
git commit -m "feat: add GitHub webhook route with signature verification"
```

---

### Task 4: Feishu Client (Token Management)

**Files:**
- Create: `src/feishu/client.ts`

**Step 1: Create src/feishu/client.ts**

```typescript
import { config } from "../config.js";

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const resp = await fetch(
    `${FEISHU_BASE}/auth/v3/tenant_access_token/internal/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: config.feishu.appId,
        app_secret: config.feishu.appSecret,
      }),
    }
  );

  const data = await resp.json();

  if (data.code !== 0) {
    throw new Error(`Failed to get tenant_access_token: ${data.msg}`);
  }

  cachedToken = data.tenant_access_token;
  // Refresh 5 minutes before expiry
  tokenExpiresAt = now + (data.expire - 300) * 1000;

  console.log("Feishu tenant_access_token refreshed");
  return cachedToken!;
}

export async function feishuRequest(
  path: string,
  body: Record<string, unknown>
): Promise<any> {
  const token = await getTenantAccessToken();

  const resp = await fetch(`${FEISHU_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (data.code !== 0) {
    console.error(`Feishu API error [${path}]:`, data);
  }

  return data;
}
```

**Step 2: Commit**

```bash
git add src/feishu/client.ts
git commit -m "feat: add Feishu API client with token caching"
```

---

### Task 5: Feishu Card Builder

**Files:**
- Create: `src/feishu/card.ts`

**Step 1: Create src/feishu/card.ts**

Build interactive card templates for each event type.

```typescript
type CardColor =
  | "blue"
  | "green"
  | "purple"
  | "yellow"
  | "grey"
  | "red"
  | "orange"
  | "turquoise";

interface CardParams {
  color: CardColor;
  title: string;
  fields: { label: string; value: string }[];
  body?: string;
  url?: string;
}

export function buildCard({ color, title, fields, body, url }: CardParams) {
  const elements: any[] = [];

  if (fields.length > 0) {
    elements.push({
      tag: "div",
      fields: fields.map((f) => ({
        is_short: true,
        text: {
          tag: "lark_md",
          content: `**${f.label}**\n${f.value}`,
        },
      })),
    });
  }

  if (body) {
    elements.push({
      tag: "markdown",
      content: body,
    });
  }

  if (url) {
    elements.push({ tag: "hr" });
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { content: "查看详情", tag: "plain_text" },
          type: "primary",
          url,
        },
      ],
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: color,
      title: { content: title, tag: "plain_text" },
    },
    elements,
  };
}
```

**Step 2: Commit**

```bash
git add src/feishu/card.ts
git commit -m "feat: add Feishu interactive card builder"
```

---

### Task 6: Feishu Message Sender

**Files:**
- Create: `src/feishu/sender.ts`

**Step 1: Create src/feishu/sender.ts**

```typescript
import { feishuRequest } from "./client.js";

export async function sendCardToUser(
  openId: string,
  card: Record<string, unknown>
): Promise<void> {
  const result = await feishuRequest("/im/v1/messages?receive_id_type=open_id", {
    receive_id: openId,
    msg_type: "interactive",
    content: JSON.stringify(card),
  });

  if (result.code === 0) {
    console.log(`Message sent to ${openId}`);
  } else {
    console.error(`Failed to send to ${openId}: ${result.msg}`);
  }
}
```

**Step 2: Commit**

```bash
git add src/feishu/sender.ts
git commit -m "feat: add Feishu message sender"
```

---

### Task 7: Event Handlers

**Files:**
- Create: `src/handlers/issues.ts`
- Create: `src/handlers/issue-comment.ts`
- Create: `src/handlers/pull-request.ts`
- Create: `src/handlers/pr-review.ts`
- Create: `src/handlers/push.ts`

Each handler receives the GitHub payload and returns a card object (or null to skip).

**Step 1: Create src/handlers/issues.ts**

```typescript
import { buildCard } from "../feishu/card.js";

const ACTION_COLORS = {
  opened: "green" as const,
  closed: "purple" as const,
  reopened: "blue" as const,
};

const SUPPORTED_ACTIONS = new Set(Object.keys(ACTION_COLORS));

export function handleIssues(payload: any) {
  const action = payload.action;
  if (!SUPPORTED_ACTIONS.has(action)) return null;

  const issue = payload.issue;
  const repo = payload.repository.full_name;
  const labels = (issue.labels || []).map((l: any) => l.name).join(", ");

  return buildCard({
    color: ACTION_COLORS[action as keyof typeof ACTION_COLORS],
    title: `Issue ${action}: ${issue.title}`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Author", value: `@${issue.user.login}` },
      ...(labels ? [{ label: "Labels", value: labels }] : []),
      { label: "#", value: `#${issue.number}` },
    ],
    url: issue.html_url,
  });
}
```

**Step 2: Create src/handlers/issue-comment.ts**

```typescript
import { buildCard } from "../feishu/card.js";

export function handleIssueComment(payload: any) {
  if (payload.action !== "created") return null;

  const comment = payload.comment;
  const issue = payload.issue;
  const repo = payload.repository.full_name;
  // Truncate long comments
  const body =
    comment.body.length > 200
      ? comment.body.slice(0, 200) + "..."
      : comment.body;

  return buildCard({
    color: "blue",
    title: `New comment on: ${issue.title}`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Author", value: `@${comment.user.login}` },
      { label: "#", value: `#${issue.number}` },
    ],
    body,
    url: comment.html_url,
  });
}
```

**Step 3: Create src/handlers/pull-request.ts**

```typescript
import { buildCard } from "../feishu/card.js";

export function handlePullRequest(payload: any) {
  const action = payload.action;
  const pr = payload.pull_request;
  const repo = payload.repository.full_name;

  const merged = action === "closed" && pr.merged;
  const effectiveAction = merged ? "merged" : action;

  const colorMap: Record<string, any> = {
    opened: "blue",
    merged: "purple",
    closed: "grey",
    reopened: "blue",
  };

  if (!colorMap[effectiveAction]) return null;

  return buildCard({
    color: colorMap[effectiveAction],
    title: `PR ${effectiveAction}: ${pr.title}`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Author", value: `@${pr.user.login}` },
      { label: "Branch", value: `${pr.head.ref} → ${pr.base.ref}` },
      { label: "#", value: `#${pr.number}` },
    ],
    url: pr.html_url,
  });
}
```

**Step 4: Create src/handlers/pr-review.ts**

```typescript
import { buildCard } from "../feishu/card.js";

const STATE_LABELS: Record<string, string> = {
  approved: "✅ Approved",
  changes_requested: "🔴 Changes Requested",
  commented: "💬 Commented",
};

export function handlePrReview(payload: any) {
  if (payload.action !== "submitted") return null;

  const review = payload.review;
  const pr = payload.pull_request;
  const repo = payload.repository.full_name;
  const state = review.state?.toLowerCase();
  const stateLabel = STATE_LABELS[state] || state;

  return buildCard({
    color: state === "approved" ? "green" : state === "changes_requested" ? "red" : "yellow",
    title: `PR Review: ${pr.title}`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Reviewer", value: `@${review.user.login}` },
      { label: "Result", value: stateLabel },
      { label: "#", value: `#${pr.number}` },
    ],
    body: review.body || undefined,
    url: review.html_url,
  });
}
```

**Step 5: Create src/handlers/push.ts**

```typescript
import { buildCard } from "../feishu/card.js";

export function handlePush(payload: any) {
  const repo = payload.repository.full_name;
  const branch = payload.ref.replace("refs/heads/", "");
  const pusher = payload.pusher.name;
  const commits = payload.commits || [];

  if (commits.length === 0) return null;

  const commitLines = commits
    .slice(0, 5)
    .map((c: any) => `• [\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message.split("\n")[0]}`)
    .join("\n");

  const extra = commits.length > 5 ? `\n... and ${commits.length - 5} more` : "";

  return buildCard({
    color: "grey",
    title: `Push to ${branch} (${commits.length} commits)`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Pusher", value: `@${pusher}` },
      { label: "Branch", value: branch },
    ],
    body: commitLines + extra,
    url: payload.compare,
  });
}
```

**Step 6: Commit**

```bash
git add src/handlers/
git commit -m "feat: add event handlers for issues, PR, review, push, comments"
```

---

### Task 8: Notification Dispatcher

**Files:**
- Create: `src/notify.ts`

**Step 1: Create src/notify.ts**

```typescript
import { config } from "./config.js";
import { sendCardToUser } from "./feishu/sender.js";
import { handleIssues } from "./handlers/issues.js";
import { handleIssueComment } from "./handlers/issue-comment.js";
import { handlePullRequest } from "./handlers/pull-request.js";
import { handlePrReview } from "./handlers/pr-review.js";
import { handlePush } from "./handlers/push.js";

type Handler = (payload: any) => ReturnType<typeof handleIssues>;

const handlers: Record<string, Handler> = {
  issues: handleIssues,
  issue_comment: handleIssueComment,
  pull_request: handlePullRequest,
  pull_request_review: handlePrReview,
  push: handlePush,
};

export async function handleEvent(
  event: string,
  payload: any
): Promise<void> {
  const handler = handlers[event];
  if (!handler) {
    console.log(`Unhandled event: ${event}, skipping`);
    return;
  }

  const repo = payload.repository?.full_name;
  if (!repo) return;

  // Find matching routes
  const matchedRoutes = config.routes.filter(
    (r) => r.repo === repo && (!r.events || r.events.includes(event))
  );

  if (matchedRoutes.length === 0) {
    console.log(`No routes matched for ${event} on ${repo}`);
    return;
  }

  const card = handler(payload);
  if (!card) {
    console.log(`Handler returned null for ${event} action=${payload.action}`);
    return;
  }

  // Collect unique subscribers across all matched routes
  const subscriberSet = new Set<string>();
  for (const route of matchedRoutes) {
    for (const sub of route.subscribers) {
      subscriberSet.add(sub);
    }
  }

  // Send to each subscriber
  const promises = [...subscriberSet].map((githubUser) => {
    const feishuId = config.userMapping[githubUser];
    if (!feishuId) {
      console.warn(`No Feishu mapping for GitHub user: ${githubUser}`);
      return Promise.resolve();
    }
    return sendCardToUser(feishuId, card);
  });

  await Promise.allSettled(promises);
  console.log(
    `Notified ${subscriberSet.size} subscribers for ${event} on ${repo}`
  );
}
```

**Step 2: Commit**

```bash
git add src/notify.ts
git commit -m "feat: add notification dispatcher with repo-subscriber routing"
```

---

### Task 9: Express Server Entry Point

**Files:**
- Create: `src/index.ts`

**Step 1: Create src/index.ts**

```typescript
import express from "express";
import { config } from "./config.js";
import { githubRouter } from "./routes/github.js";

const app = express();

// Parse JSON body and preserve raw body for signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Routes
app.use(githubRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.server.port, () => {
  console.log(`GitHub-Feishu-Notify running on port ${config.server.port}`);
  console.log(`Routes configured: ${config.routes.length}`);
  console.log(`User mappings: ${Object.keys(config.userMapping).length}`);
});
```

**Step 2: Create a config.yaml for local dev (copy from example)**

```bash
cp config.example.yaml config.yaml
```

**Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Express server entry point"
```

---

### Task 10: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yaml`

**Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Step 2: Create docker-compose.yaml**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./config.yaml:/app/config.yaml:ro
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

**Step 3: Commit**

```bash
git add Dockerfile docker-compose.yaml
git commit -m "feat: add Docker and docker-compose setup"
```

---

### Task 11: Final Polish and Push

**Step 1: Verify build works**

```bash
npx tsc --noEmit
```

**Step 2: Push all commits to GitHub**

```bash
git push origin main
```
