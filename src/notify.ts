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

  const subscriberSet = new Set<string>();
  for (const route of matchedRoutes) {
    for (const sub of route.subscribers) {
      subscriberSet.add(sub);
    }
  }

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
