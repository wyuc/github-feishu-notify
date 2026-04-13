import { buildCard } from "../feishu/card.js";
import type { HandlerResult } from "../notify.js";

const STATE_LABELS: Record<string, string> = {
  approved: "✅ Approved",
  changes_requested: "🔴 Changes Requested",
  commented: "💬 Commented",
};

export function handlePrReview(payload: any): HandlerResult | null {
  if (payload.action !== "submitted") return null;

  const review = payload.review;
  const pr = payload.pull_request;
  const repo = payload.repository;
  const state = review.state?.toLowerCase();
  const stateLabel = STATE_LABELS[state] || state;

  const mentions = new Set<string>();

  // PR author
  if (pr.user?.login) mentions.add(pr.user.login);

  // Reviewer
  if (review.user?.login) mentions.add(review.user.login);

  // PR assignees
  for (const a of pr.assignees || []) {
    if (a.login) mentions.add(a.login);
  }

  // Other requested reviewers
  for (const r of pr.requested_reviewers || []) {
    if (r.login) mentions.add(r.login);
  }

  return {
    card: buildCard({
      color: state === "approved" ? "green" : state === "changes_requested" ? "red" : "yellow",
      title: `PR Review: ${pr.title}`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: "Reviewer", value: `@${review.user.login}` },
        { label: "Result", value: stateLabel },
        { label: "#", value: `[#${pr.number}](${pr.html_url})` },
      ],
      body: review.body || undefined,
      url: review.html_url,
    }),
    mentions: [...mentions],
    sender: review.user?.login,
  };
}
