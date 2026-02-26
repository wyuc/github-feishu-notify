import { buildCard } from "../feishu/card.js";

export function handlePush(payload: any) {
  const repo = payload.repository.full_name;
  const branch = payload.ref.replace("refs/heads/", "");
  const pusher = payload.pusher.name;
  const commits = payload.commits || [];

  if (commits.length === 0) return null;

  const commitLines = commits
    .slice(0, 5)
    .map((c: any) => `• [\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message.split("\n")[0]}`)
    .join("\n");

  const extra = commits.length > 5 ? `\n... and ${commits.length - 5} more` : "";

  return buildCard({
    color: "grey",
    title: `Push to ${branch} (${commits.length} commits)`,
    fields: [
      { label: "Repo", value: repo },
      { label: "Pusher", value: `@${pusher}` },
      { label: "Branch", value: branch },
    ],
    body: commitLines + extra,
    url: payload.compare,
  });
}
