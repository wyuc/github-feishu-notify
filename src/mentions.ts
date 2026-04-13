import { config } from "./config.js";

/**
 * Extract GitHub usernames mentioned in text body (@username pattern)
 */
export function extractMentionsFromBody(body: string | undefined | null): string[] {
  if (!body) return [];
  const matches = body.match(/@([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

/**
 * Given a list of GitHub usernames that are "related" to this event,
 * build a Feishu <at> markdown string for those who exist in userMapping.
 * Excludes the sender (don't @ yourself).
 */
export function buildMentionElement(
  relatedUsers: string[],
  senderGithub?: string,
  userMapping?: Record<string, string>
): any | null {
  const mapping = userMapping || config.userMapping;
  
  const atTags = relatedUsers
    .filter(u => u !== senderGithub) // don't @ the sender
    .filter(u => mapping[u])         // only those with feishu mapping
    .map(u => `<at id=${mapping[u]}></at>`)
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe

  if (atTags.length === 0) return null;

  return {
    tag: "div",
    text: {
      tag: "lark_md",
      content: `👤 ${atTags.join(" ")}`,
    },
  };
}
