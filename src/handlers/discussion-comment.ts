import { buildCard } from "../feishu/card.js";
import { extractMentionsFromBody } from "../mentions.js";
import type { HandlerResult } from "../notify.js";

const ACTION_COLORS = {
  created: "blue",
  edited: "yellow",
  deleted: "grey",
} as const;

export function handleDiscussionComment(payload: any): HandlerResult | null {
  const action = payload.action;
  if (!action || !(action in ACTION_COLORS)) return null;

  const comment = payload.comment;
  const discussion = payload.discussion;
  const repo = payload.repository;

  if (!comment || !discussion || !repo) return null;

  const mentions = new Set<string>();

  // Discussion author (should know about comments on their discussion)
  if (discussion.user?.login) mentions.add(discussion.user.login);

  // Comment author
  if (comment.user?.login) mentions.add(comment.user.login);

  // @mentions in comment body
  for (const u of extractMentionsFromBody(comment.body)) {
    mentions.add(u);
  }

  return {
    card: buildCard({
      color: ACTION_COLORS[action as keyof typeof ACTION_COLORS],
      title: `Discussion comment ${action}: ${discussion.title}`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: "Author", value: comment.user?.login ? `@${comment.user.login}` : "-" },
        ...(discussion.category?.name ? [{ label: "Category", value: discussion.category.name }] : []),
        { label: "#", value: `[#${discussion.number}](${discussion.html_url})` },
      ],
      body: comment.body,
      url: comment.html_url || discussion.html_url,
    }),
    mentions: [...mentions],
    sender: comment.user?.login,
  };
}
