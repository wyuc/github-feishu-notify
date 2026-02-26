import { Router, Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { handleEvent } from "../notify.js";

const router = Router();

function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!config.github.webhookSecret) return true;
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

  handleEvent(event, payload).catch((err) => {
    console.error("Error handling event:", err);
  });

  res.status(200).json({ ok: true });
});

export { router as githubRouter };
