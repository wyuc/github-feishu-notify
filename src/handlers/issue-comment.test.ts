import assert from "node:assert/strict";
import test from "node:test";
import { handleIssueComment } from "./issue-comment.js";

test("handleIssueComment keeps the full comment body", () => {
  const longBody = "a".repeat(260);
  const result = handleIssueComment({
    action: "created",
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    issue: {
      title: "Bug report",
      number: 8,
      html_url: "https://github.com/org/repo/issues/8",
    },
    comment: {
      body: longBody,
      html_url: "https://github.com/org/repo/issues/8#issuecomment-1",
      user: { login: "alice" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.elements[1].content, longBody);
});
