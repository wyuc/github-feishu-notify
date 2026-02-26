import { buildCard } from "../feishu/card.js";

export function handleIssueComment(payload: any) {
  if (payload.action !== "created") return null;

  const comment = payload.comment;
  const issue = payload.issue;
  const repo = payload.repository.full_name;
  const body =
    comment.body.length > 200
      ? comment.body.slice(0, 200) + "..."
      : comment.body;

  return buildCard({
    color: "blue",
    title: `New comment on: ${issue.title}`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Author", value: `@${comment.user.login}` },
      { label: "#", value: `#${issue.number}` },
    ],
    body,
    url: comment.html_url,
  });
}
