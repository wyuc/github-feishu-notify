import { buildCard } from "../feishu/card.js";
import { extractMentionsFromBody } from "../mentions.js";
import type { HandlerResult } from "../notify.js";

function formatEditedBody(payload: any, pr: any) {
  const changes = payload.changes || {};
  const sections: string[] = [];

  if (changes.title?.from !== undefined) {
    sections.push(`**Title**\n${changes.title.from} -> ${pr.title}`);
  }

  if (changes.body?.from !== undefined) {
    sections.push(`**Body**\n${pr.body || "(empty)"}`);
  }

  if (changes.base?.ref?.from !== undefined) {
    sections.push(`**Base branch**\n${changes.base.ref.from} -> ${pr.base.ref}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : undefined;
}

function formatSynchronizeBody(payload: any, pr: any) {
  const sections: string[] = [];

  if (payload.before && payload.after) {
    sections.push(
      `**Head**\n\`${String(payload.before).slice(0, 7)}\` -> \`${String(payload.after).slice(0, 7)}\``
    );
  } else if (pr.head?.sha) {
    sections.push(`**Head**\n\`${String(pr.head.sha).slice(0, 7)}\``);
  }

  return sections.length > 0 ? sections.join("\n\n") : undefined;
}

function formatEditedFields(payload: any) {
  const changes = payload.changes || {};
  const changedFields: string[] = [];

  if (changes.title?.from !== undefined) changedFields.push("title");
  if (changes.body?.from !== undefined) changedFields.push("body");
  if (changes.base?.ref?.from !== undefined) changedFields.push("base");

  return changedFields.length > 0 ? changedFields.join(", ") : "metadata";
}

/**
 * Collect all GitHub users related to this PR event
 */
function collectMentions(payload: any, pr: any): string[] {
  const users = new Set<string>();

  // PR author
  if (pr.user?.login) users.add(pr.user.login);

  // Assignees
  for (const a of pr.assignees || []) {
    if (a.login) users.add(a.login);
  }

  // Requested reviewers
  for (const r of pr.requested_reviewers || []) {
    if (r.login) users.add(r.login);
  }

  // Merged by
  if (pr.merged_by?.login) users.add(pr.merged_by.login);

  // @mentions in PR body
  for (const u of extractMentionsFromBody(pr.body)) {
    users.add(u);
  }

  return [...users];
}

export function handlePullRequest(payload: any): HandlerResult | null {
  const action = payload.action;
  const pr = payload.pull_request;
  const repo = payload.repository;

  const merged = action === "closed" && pr.merged;
  const effectiveAction = merged ? "merged" : action;

  const colorMap: Record<string, any> = {
    opened: "blue",
    edited: "yellow",
    synchronize: "blue",
    merged: "purple",
    closed: "grey",
    reopened: "blue",
    ready_for_review: "green",
    converted_to_draft: "grey",
  };

  if (!colorMap[effectiveAction]) return null;

  const labelMap: Record<string, string> = {
    ready_for_review: "ready for review",
    converted_to_draft: "converted to draft",
    synchronize: "updated",
  };
  const label = labelMap[effectiveAction] || effectiveAction;

  const card = buildCard({
    color: colorMap[effectiveAction],
    title: `PR ${label}: ${pr.title}`,
    repoName: repo.name || repo.full_name,
    fields: [
      { label: "Repo", value: `[${repo.full_name}](${repo.html_url})` },
      { label: "Author", value: `@${pr.user.login}` },
      ...(effectiveAction === "edited"
        ? [
            { label: "Editor", value: payload.sender?.login ? `@${payload.sender.login}` : "-" },
            { label: "Changed", value: formatEditedFields(payload) },
          ]
        : effectiveAction === "synchronize"
          ? [
              { label: "Updater", value: payload.sender?.login ? `@${payload.sender.login}` : "-" },
              {
                label: "Head",
                value:
                  payload.before && payload.after
                    ? `\`${String(payload.before).slice(0, 7)}\` -> \`${String(payload.after).slice(0, 7)}\``
                    : pr.head?.sha
                      ? `\`${String(pr.head.sha).slice(0, 7)}\``
                      : "-",
              },
            ]
          : []),
      { label: "Branch", value: `${pr.head.ref} → ${pr.base.ref}` },
      { label: "#", value: `[#${pr.number}](${pr.html_url})` },
    ],
    body:
      effectiveAction === "edited"
        ? formatEditedBody(payload, pr)
        : effectiveAction === "synchronize"
          ? formatSynchronizeBody(payload, pr)
          : undefined,
    url: pr.html_url,
  });

  return {
    card,
    mentions: collectMentions(payload, pr),
    sender: payload.sender?.login,
  };
}
