import assert from "node:assert/strict";
import test from "node:test";
import { handleDiscussionComment } from "./discussion-comment.js";

test("handleDiscussionComment builds a card for created discussion comments", () => {
  const result = handleDiscussionComment({
    action: "created",
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    discussion: {
      title: "Roadmap ideas",
      number: 7,
      html_url: "https://github.com/org/repo/discussions/7",
      category: { name: "Ideas" },
    },
    comment: {
      body: "I think we should prioritize mobile.",
      html_url: "https://github.com/org/repo/discussions/7#discussioncomment-2",
      user: { login: "carol" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.header.template, "blue");
  assert.equal(
    card.header.title.content,
    "【repo】 Discussion comment created: Roadmap ideas"
  );
  assert.equal(card.elements[1].content, "I think we should prioritize mobile.");
});

test("handleDiscussionComment ignores unsupported comment actions", () => {
  assert.equal(
    handleDiscussionComment({
      action: "restored",
      repository: { full_name: "org/repo", html_url: "https://github.com/org/repo" },
      discussion: { title: "Roadmap ideas" },
      comment: {},
    }),
    null
  );
});

test("handleDiscussionComment keeps the full comment body", () => {
  const longBody = "c".repeat(320);
  const result = handleDiscussionComment({
    action: "created",
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    discussion: {
      title: "Roadmap ideas",
      number: 7,
      html_url: "https://github.com/org/repo/discussions/7",
    },
    comment: {
      body: longBody,
      html_url: "https://github.com/org/repo/discussions/7#discussioncomment-3",
      user: { login: "carol" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.elements[1].content, longBody);
});
