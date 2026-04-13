import { buildCard } from "../feishu/card.js";
import { extractMentionsFromBody } from "../mentions.js";
import type { HandlerResult } from "../notify.js";

export function handleIssueComment(payload: any): HandlerResult | null {
  if (payload.action !== "created") return null;

  const comment = payload.comment;
  const issue = payload.issue;
  const repo = payload.repository;

  const mentions = new Set<string>();

  // Issue author
  if (issue.user?.login) mentions.add(issue.user.login);

  // Issue assignees
  for (const a of issue.assignees || []) {
    if (a.login) mentions.add(a.login);
  }

  // @mentions in comment body
  for (const u of extractMentionsFromBody(comment.body)) {
    mentions.add(u);
  }

  return {
    card: buildCard({
      color: "blue",
      title: `New comment on: ${issue.title}`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: "Author", value: `@${comment.user.login}` },
        { label: "#", value: `[#${issue.number}](${issue.html_url})` },
      ],
      body: comment.body,
      url: comment.html_url,
    }),
    mentions: [...mentions],
    sender: comment.user?.login,
  };
}
