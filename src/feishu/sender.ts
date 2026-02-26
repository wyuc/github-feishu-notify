import { feishuRequest } from "./client.js";

export async function sendCardToUser(
  openId: string,
  card: Record<string, unknown>
): Promise<void> {
  const result = await feishuRequest("/im/v1/messages?receive_id_type=open_id", {
    receive_id: openId,
    msg_type: "interactive",
    content: JSON.stringify(card),
  });

  if (result.code === 0) {
    console.log(`Message sent to ${openId}`);
  } else {
    console.error(`Failed to send to ${openId}: ${result.msg}`);
  }
}
