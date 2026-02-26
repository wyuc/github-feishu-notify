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
