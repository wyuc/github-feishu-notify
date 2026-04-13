import { buildCard } from "../feishu/card.js";
import type { HandlerResult } from "../notify.js";

export function handlePush(payload: any): HandlerResult | null {
  const repo = payload.repository;
  const branch = payload.ref.replace("refs/heads/", "");
  const pusher = payload.pusher.name;
  const commits = payload.commits || [];

  if (commits.length === 0) return null;

  const commitLines = commits
    .slice(0, 5)
    .map((c: any) => `• [\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message.split("\n")[0]}`)
    .join("\n");

  const extra = commits.length > 5 ? `\n... and ${commits.length - 5} more` : "";

  // Collect unique commit authors
  const mentions = new Set<string>();
  for (const c of commits) {
    if (c.author?.username) mentions.add(c.author.username);
    if (c.committer?.username) mentions.add(c.committer.username);
  }

  return {
    card: buildCard({
      color: "grey",
      title: `Push to ${branch} (${commits.length} commits)`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: "Pusher", value: `@${pusher}` },
        { label: "Branch", value: branch },
      ],
      body: commitLines + extra,
      url: payload.compare,
    }),
    mentions: [...mentions],
    sender: pusher,
  };
}
