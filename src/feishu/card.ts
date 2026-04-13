type CardColor =
  | "blue"
  | "green"
  | "purple"
  | "yellow"
  | "grey"
  | "red"
  | "orange"
  | "turquoise";

interface CardParams {
  color: CardColor;
  title: string;
  repoName?: string;
  fields: { label: string; value: string }[];
  body?: string;
  url?: string;
}

function formatTitle(repoName: string | undefined, title: string) {
  return repoName ? `【${repoName}】 ${title}` : title;
}

export function buildCard({ color, title, repoName, fields, body, url }: CardParams) {
  const elements: any[] = [];

  if (fields.length > 0) {
    elements.push({
      tag: "div",
      fields: fields.map((f) => ({
        is_short: true,
        text: {
          tag: "lark_md",
          content: `**${f.label}**\n${f.value}`,
        },
      })),
    });
  }

  if (body) {
    elements.push({
      tag: "markdown",
      content: body,
    });
  }

  if (url) {
    elements.push({ tag: "hr" });
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { content: "查看详情", tag: "plain_text" },
          type: "primary",
          url,
        },
      ],
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: color,
      title: { content: formatTitle(repoName, title), tag: "plain_text" },
    },
    elements,
  };
}
