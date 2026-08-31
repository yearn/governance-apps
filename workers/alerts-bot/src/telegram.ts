interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
  parameters?: {
    retry_after?: number;
  };
}

export class TelegramRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("telegram_rate_limited");
    this.name = "TelegramRateLimitError";
  }
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

  const retryAfter = payload?.parameters?.retry_after;
  if (
    response.status === 429 &&
    Number.isSafeInteger(retryAfter) &&
    (retryAfter as number) > 0
  ) {
    throw new TelegramRateLimitError(retryAfter as number);
  }
  if (!response.ok || payload?.ok !== true) {
    throw new Error("telegram_send_failed");
  }
}
