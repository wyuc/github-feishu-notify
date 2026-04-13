import assert from "node:assert/strict";
import test from "node:test";
import type { RouteConfig } from "./config.js";
import { extractPushBranch, routeMatches } from "./route-match.js";

const pushRoute: RouteConfig = {
  repo: "org/repo",
  subscribers: ["octocat"],
  events: ["push"],
  branches: ["main"],
};

test("extractPushBranch returns branch name for heads ref", () => {
  assert.equal(extractPushBranch("refs/heads/main"), "main");
  assert.equal(extractPushBranch("refs/heads/feature/login"), "feature/login");
});

test("extractPushBranch ignores non-branch refs", () => {
  assert.equal(extractPushBranch("refs/tags/v1.0.0"), undefined);
  assert.equal(extractPushBranch(undefined), undefined);
});

test("routeMatches allows push on configured branch", () => {
  assert.equal(routeMatches(pushRoute, "org/repo", "push", "main"), true);
});

test("routeMatches rejects push on other branches", () => {
  assert.equal(routeMatches(pushRoute, "org/repo", "push", "feature/login"), false);
});

test("routeMatches does not apply branch filter to non-push events", () => {
  const issuesRoute: RouteConfig = {
    repo: "org/repo",
    subscribers: ["octocat"],
    events: ["issues"],
    branches: ["main"],
  };

  assert.equal(routeMatches(issuesRoute, "org/repo", "issues"), true);
});

test("routeMatches treats an empty branches list as matching no push branches", () => {
  const emptyBranchesRoute: RouteConfig = {
    repo: "org/repo",
    subscribers: ["octocat"],
    events: ["push"],
    branches: [],
  };

  assert.equal(routeMatches(emptyBranchesRoute, "org/repo", "push", "main"), false);
});
