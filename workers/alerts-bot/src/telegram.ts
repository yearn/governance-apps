interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
}

export async function sendMessage(
  chatId: string,
  html: string,
  botToken: string,
): Promise<void> {
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const payload =
    (await response.json().catch(() => null)) as TelegramSendMessageResponse | null;

  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      `Telegram sendMessage failed: ${payload?.description ?? response.statusText}`,
    );
  }
}
