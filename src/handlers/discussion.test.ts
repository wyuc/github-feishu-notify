import assert from "node:assert/strict";
import test from "node:test";
import { handleDiscussion } from "./discussion.js";

test("handleDiscussion builds a card for answered discussions", () => {
  const result = handleDiscussion({
    action: "answered",
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    discussion: {
      title: "How should we version releases?",
      number: 12,
      html_url: "https://github.com/org/repo/discussions/12",
      body: "Initial question",
      user: { login: "alice" },
      category: { name: "Q&A" },
    },
    answer: {
      body: "Use semantic versioning.",
      html_url: "https://github.com/org/repo/discussions/12#discussioncomment-1",
      user: { login: "bob" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.header.template, "green");
  assert.equal(
    card.header.title.content,
    "【repo】 Discussion answered: How should we version releases?"
  );
  assert.equal(card.elements[1].content, "Use semantic versioning.");
});

test("handleDiscussion ignores unsupported discussion actions", () => {
  assert.equal(
    handleDiscussion({
      action: "unknown_action",
      repository: { full_name: "org/repo", html_url: "https://github.com/org/repo" },
      discussion: { title: "Question" },
    }),
    null
  );
});

test("handleDiscussion keeps the full discussion body", () => {
  const longBody = "b".repeat(320);
  const result = handleDiscussion({
    action: "created",
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    discussion: {
      title: "Long form proposal",
      number: 13,
      html_url: "https://github.com/org/repo/discussions/13",
      body: longBody,
      user: { login: "alice" },
      category: { name: "Ideas" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.elements[1].content, longBody);
});
