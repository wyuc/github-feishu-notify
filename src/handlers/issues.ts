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
