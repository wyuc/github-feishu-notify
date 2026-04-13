import { buildCard } from "../feishu/card.js";
import { extractMentionsFromBody } from "../mentions.js";
import type { HandlerResult } from "../notify.js";

const ACTION_COLORS = {
  opened: "green" as const,
  closed: "purple" as const,
  reopened: "blue" as const,
};

const SUPPORTED_ACTIONS = new Set(Object.keys(ACTION_COLORS));

export function handleIssues(payload: any): HandlerResult | null {
  const action = payload.action;
  if (!SUPPORTED_ACTIONS.has(action)) return null;

  const issue = payload.issue;
  const repo = payload.repository;
  const labels = (issue.labels || []).map((l: any) => l.name).join(", ");

  const mentions = new Set<string>();

  // Issue author
  if (issue.user?.login) mentions.add(issue.user.login);

  // Assignees
  for (const a of issue.assignees || []) {
    if (a.login) mentions.add(a.login);
  }

  // @mentions in body
  for (const u of extractMentionsFromBody(issue.body)) {
    mentions.add(u);
  }

  return {
    card: buildCard({
      color: ACTION_COLORS[action as keyof typeof ACTION_COLORS],
      title: `Issue ${action}: ${issue.title}`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: "Author", value: `@${issue.user.login}` },
        ...(labels ? [{ label: "Labels", value: labels }] : []),
        { label: "#", value: `[#${issue.number}](${issue.html_url})` },
      ],
      url: issue.html_url,
    }),
    mentions: [...mentions],
    sender: payload.sender?.login,
  };
}
