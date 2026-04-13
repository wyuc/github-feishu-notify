import type { RouteConfig } from "./config.js";

const BRANCH_REF_PREFIX = "refs/heads/";

export function extractPushBranch(ref: unknown): string | undefined {
  if (typeof ref !== "string" || !ref.startsWith(BRANCH_REF_PREFIX)) {
    return undefined;
  }

  return ref.slice(BRANCH_REF_PREFIX.length);
}

export function routeMatches(
  route: RouteConfig,
  repo: string,
  event: string,
  branch?: string
): boolean {
  if (route.repo !== repo) return false;
  if (route.events && !route.events.includes(event)) return false;
  if (event !== "push") return true;
  if (route.branches === undefined) return true;

  return branch !== undefined && route.branches.includes(branch);
}
