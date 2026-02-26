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
