import { buildCard } from "../feishu/card.js";
import type { HandlerResult } from "../notify.js";

const CONCLUSION_COLORS = {
  success: "green",
  failure: "red",
  cancelled: "grey",
  timed_out: "orange",
  action_required: "orange",
  neutral: "blue",
  skipped: "grey",
  stale: "grey",
} as const;

function formatConclusion(conclusion: string | undefined): string {
  if (!conclusion) return "Completed";

  return conclusion
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDuration(
  startedAt: string | undefined,
  updatedAt: string | undefined
): string | undefined {
  if (!startedAt || !updatedAt) return undefined;

  const start = Date.parse(startedAt);
  const end = Date.parse(updatedAt);

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return undefined;
  }

  const totalSeconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function handleWorkflowRun(payload: any): HandlerResult | null {
  if (payload.action !== "completed") return null;

  const run = payload.workflow_run;
  const repo = payload.repository;

  if (!run || !repo) return null;

  const conclusion = run.conclusion as string | undefined;
  const conclusionLabel = formatConclusion(conclusion);
  const color =
    conclusion && conclusion in CONCLUSION_COLORS
      ? CONCLUSION_COLORS[conclusion as keyof typeof CONCLUSION_COLORS]
      : "blue";
  const duration = formatDuration(run.run_started_at, run.updated_at);
  const actor = run.actor?.login || payload.sender?.login;
  const headSha = typeof run.head_sha === "string" ? run.head_sha.slice(0, 7) : undefined;
  const bodyLines = [
    run.display_title ? `**Title**\n${run.display_title}` : undefined,
    headSha ? `**Commit**\n\`${headSha}\`` : undefined,
  ].filter(Boolean);

  // For workflow failures, mention the actor so they get a ping
  const mentions: string[] = [];
  if (actor) mentions.push(actor);
  // Also mention the head commit author if available
  if (run.head_commit?.author?.name) {
    mentions.push(run.head_commit.author.name);
  }

  return {
    card: buildCard({
      color,
      title: `Workflow ${conclusionLabel}: ${run.name}`,
      repoName: repo.name || repo.full_name,
      fields: [
        { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
        { label: "Result", value: conclusionLabel },
        { label: "Workflow", value: run.name },
        { label: "Branch", value: run.head_branch || "-" },
        { label: "Trigger", value: run.event || "-" },
        { label: "Actor", value: actor ? `@${actor}` : "-" },
        { label: "Run", value: `#${run.run_number}${run.run_attempt > 1 ? ` (attempt ${run.run_attempt})` : ""}` },
        ...(duration ? [{ label: "Duration", value: duration }] : []),
      ],
      body: bodyLines.length > 0 ? bodyLines.join("\n\n") : undefined,
      url: run.html_url,
    }),
    mentions,
    sender: payload.sender?.login,
  };
}
