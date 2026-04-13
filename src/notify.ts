import { config } from "./config.js";
import { sendCardToUser } from "./feishu/sender.js";
import { handleDiscussion } from "./handlers/discussion.js";
import { handleDiscussionComment } from "./handlers/discussion-comment.js";
import { handleIssues } from "./handlers/issues.js";
import { handleIssueComment } from "./handlers/issue-comment.js";
import { handlePullRequest } from "./handlers/pull-request.js";
import { handlePrReview } from "./handlers/pr-review.js";
import { handlePush } from "./handlers/push.js";
import { handleWorkflowRun } from "./handlers/workflow-run.js";
import { extractPushBranch, routeMatches } from "./route-match.js";
import { buildMentionElement, extractMentionsFromBody } from "./mentions.js";

export interface HandlerResult {
  card: Record<string, unknown>;
  /** GitHub usernames this event is related to (for @mention in Feishu) */
  mentions?: string[];
  /** The GitHub username who triggered this event (won't be @mentioned) */
  sender?: string;
}

type Handler = (payload: any) => HandlerResult | null;

const handlers: Record<string, Handler> = {
  discussion: handleDiscussion,
  discussion_comment: handleDiscussionComment,
  issues: handleIssues,
  issue_comment: handleIssueComment,
  pull_request: handlePullRequest,
  pull_request_review: handlePrReview,
  push: handlePush,
  workflow_run: handleWorkflowRun,
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

  const branch = event === "push" ? extractPushBranch(payload.ref) : undefined;

  const matchedRoutes = config.routes.filter(
    (r) => routeMatches(r, repo, event, branch)
  );

  if (matchedRoutes.length === 0) {
    const branchSuffix =
      event === "push" ? ` (branch=${branch ?? payload.ref ?? "unknown"})` : "";
    console.log(`No routes matched for ${event} on ${repo}${branchSuffix}`);
    return;
  }

  const result = handler(payload);
  if (!result) {
    console.log(`Handler returned null for ${event} action=${payload.action}`);
    return;
  }

  const { card, mentions, sender } = result;

  // Inject @mention element into card if there are related users
  if (mentions && mentions.length > 0) {
    const mentionEl = buildMentionElement(mentions, sender);
    if (mentionEl && card.elements && Array.isArray(card.elements)) {
      // Insert before the last element (usually the "查看详情" button)
      // Find the hr+action block at the end
      const elements = card.elements as any[];
      let hrIndex = -1;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (elements[i].tag === "hr") { hrIndex = i; break; }
      }
      if (hrIndex > 0) {
        elements.splice(hrIndex, 0, mentionEl);
      } else {
        elements.push(mentionEl);
      }
    }
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
