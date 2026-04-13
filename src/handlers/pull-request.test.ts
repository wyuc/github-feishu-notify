import assert from "node:assert/strict";
import test from "node:test";
import { handlePullRequest } from "./pull-request.js";

test("handlePullRequest builds a card for edited pull requests", () => {
  const result = handlePullRequest({
    action: "edited",
    sender: { login: "reviewer" },
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    pull_request: {
      title: "Improve onboarding copy",
      body: "New full description",
      html_url: "https://github.com/org/repo/pull/12",
      number: 12,
      user: { login: "alice" },
      head: { ref: "feature/onboarding" },
      base: { ref: "main" },
      merged: false,
    },
    changes: {
      title: { from: "Improve docs" },
      body: { from: "Old description" },
    },
  });

  assert.ok(result);
  const card = result.card as any;
  const mentions = result.mentions;
  assert.equal(card.header.template, "yellow");
  assert.equal(
    card.header.title.content,
    "【repo】 PR edited: Improve onboarding copy"
  );
  assert.equal(
    card.elements[1].content,
    "**Title**\nImprove docs -> Improve onboarding copy\n\n**Body**\nNew full description"
  );
  assert.ok(mentions);
  assert.ok(mentions.includes("alice"));
});

test("handlePullRequest ignores unsupported pull request actions", () => {
  assert.equal(
    handlePullRequest({
      action: "assigned",
      repository: {
        full_name: "org/repo",
        html_url: "https://github.com/org/repo",
      },
      pull_request: {
        title: "PR title",
        html_url: "https://github.com/org/repo/pull/12",
        number: 12,
        user: { login: "alice" },
        head: { ref: "feature/onboarding" },
        base: { ref: "main" },
        merged: false,
      },
    }),
    null
  );
});

test("handlePullRequest builds a card for synchronized pull requests", () => {
  const result = handlePullRequest({
    action: "synchronize",
    before: "1234567890abcdef",
    after: "abcdef1234567890",
    sender: { login: "reviewer" },
    repository: {
      name: "repo",
      full_name: "org/repo",
      html_url: "https://github.com/org/repo",
    },
    pull_request: {
      title: "Improve onboarding copy",
      body: "New full description",
      html_url: "https://github.com/org/repo/pull/12",
      number: 12,
      user: { login: "alice" },
      head: { ref: "feature/onboarding", sha: "abcdef1234567890" },
      base: { ref: "main" },
      merged: false,
    },
  });

  assert.ok(result);
  const card = result.card as any;
  assert.equal(card.header.template, "blue");
  assert.equal(
    card.header.title.content,
    "【repo】 PR updated: Improve onboarding copy"
  );
  assert.equal(
    card.elements[1].content,
    "**Head**\n\`1234567\` -> \`abcdef1\`"
  );
});
