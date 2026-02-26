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
