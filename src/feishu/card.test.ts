import assert from "node:assert/strict";
import test from "node:test";
import { buildCard } from "./card.js";

test("buildCard prefixes title with repo name when provided", () => {
  const card = buildCard({
    color: "blue",
    repoName: "OpenMAIC",
    title: "PR merged: Improve cards",
    fields: [],
  });

  assert.equal(card.header.title.content, "【OpenMAIC】 PR merged: Improve cards");
});

test("buildCard keeps the original title when repo name is missing", () => {
  const card = buildCard({
    color: "green",
    title: "Issue opened: Something broke",
    fields: [],
  });

  assert.equal(card.header.title.content, "Issue opened: Something broke");
});
