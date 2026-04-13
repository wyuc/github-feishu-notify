import assert from "node:assert/strict";
import test from "node:test";
import { handleWorkflowRun } from "./workflow-run.js";

test("handleWorkflowRun builds a card for completed runs", () => {
  const result = handleWorkflowRun({
    action: "completed",
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    workflow_run: {
      name: "CI",
      conclusion: "failure",
      html_url: "https://github.com/org/repo/actions/runs/123",
      head_branch: "main",
      event: "push",
      run_number: 42,
      run_attempt: 1,
      run_started_at: "2026-03-15T10:00:00Z",
      updated_at: "2026-03-15T10:02:05Z",
      display_title: "Fix flaky test",
      head_sha: "abcdef1234567890",
      actor: { login: "octocat" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.header.template, "red");
  assert.equal(card.header.title.content, "【repo】 Workflow Failure: CI");
  assert.equal(card.elements[1].content, "**Title**\nFix flaky test\n\n**Commit**\n\`abcdef1\`");
});

test("handleWorkflowRun ignores non-completed actions", () => {
  assert.equal(
    handleWorkflowRun({
      action: "requested",
      repository: {
        full_name: "org/repo",
        html_url: "https://github.com/org/repo",
      },
      workflow_run: {
        name: "CI",
      },
    }),
    null
  );
});
