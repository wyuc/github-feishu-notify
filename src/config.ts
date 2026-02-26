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
