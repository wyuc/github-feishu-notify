import { buildCard } from "../feishu/card.js";
import { extractMentionsFromBody } from "../mentions.js";
import type { HandlerResult } from "../notify.js";

const ACTION_COLORS = {
  answered: "green",
  unanswered: "yellow",
  created: "green",
  edited: "blue",
  deleted: "grey",
  transferred: "blue",
  pinned: "blue",
  unpinned: "grey",
  labeled: "turquoise",
  unlabeled: "grey",
  locked: "orange",
  unlocked: "blue",
  category_changed: "turquoise",
} as const;

const ACTION_LABELS: Record<string, string> = {
  category_changed: "category changed",
};

function formatAction(action: string) {
  return ACTION_LABELS[action] || action.replaceAll("_", " ");
}

export function handleDiscussion(payload: any): HandlerResult | null {
  const action = payload.action;
  if (!action || !(action in ACTION_COLORS)) return null;

  const discussion = payload.discussion;
  const repo = payload.repository;

  if (!discussion || !repo) return null;

  const category = discussion.category?.name;
  const label = formatAction(action);
  const answer = payload.answer;
  const actor =
    action === "answered"
      ? answer?.user?.login || payload.sender?.login
      : discussion.user?.login || payload.sender?.login;
  const body =
    action === "answered"
      ? answer?.body
      : discussion.body;

  const mentions = new Set<string>();

  // Discussion author
  if (discussion.user?.login) mentions.add(discussion.user.login);

  // Answer author
  if (answer?.user?.login) mentions.add(answer.user.login);

  // @mentions in body
  for (const u of extractMentionsFromBody(body)) {
    mentions.add(u);
  }

  return {
    card: buildCard({
      color: ACTION_COLORS[action as keyof typeof ACTION_COLORS],
      title: `Discussion ${label}: ${discussion.title}`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: action === "answered" ? "Answer By" : "Author", value: actor ? `@${actor}` : "-" },
        ...(category ? [{ label: "Category", value: category }] : []),
        { label: "#", value: `[#${discussion.number}](${discussion.html_url})` },
      ],
      body,
      url: answer?.html_url || discussion.html_url,
    }),
    mentions: [...mentions],
    sender: payload.sender?.login,
  };
}
