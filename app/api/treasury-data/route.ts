import { readBoundedJson, withFeedRequest } from "@/lib/feed-transport";
import { TREASURY_FEED_POLICY, TreasuryFeedError } from "@/lib/clients/treasury/feed";
import { parseTreasuryFeed } from "@/lib/schemas/treasury-feed";
import { isTreasuryEnabled, isProductionRuntime } from "@/lib/runtime/features";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  if (!isTreasuryEnabled()) return new Response(null, { status: 404, headers });
  const url = process.env.TREASURY_DATA_URL;
  if (!url) return Response.json({ error: "Treasury feed is not configured." }, { status: 503, headers });
  try {
    const parsed = new URL(url);
    const localPreview = !isProductionRuntime() && parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if ((parsed.protocol !== "https:" && !localPreview) || parsed.username || parsed.password) {
      return Response.json({ error: "Treasury feed configuration is invalid." }, { status: 503, headers });
    }
    return await withFeedRequest(url, TREASURY_FEED_POLICY, async (upstream, context) => {
      if (!upstream.ok) {
        await upstream.body?.cancel().catch(() => undefined);
        return Response.json({ error: "Treasury upstream is unavailable." }, { status: 502, headers });
      }
      const feed = parseTreasuryFeed(await readBoundedJson(upstream, context, TREASURY_FEED_POLICY));
      if (feed.mode !== "live" || feed.generatedAt > Math.floor(Date.now() / 1000) + 60) {
        return Response.json({ error: "Treasury publication is invalid." }, { status: 502, headers });
      }
      return Response.json(feed, { headers });
    });
  } catch (error) {
    return Response.json({ error: "Treasury upstream is unavailable." }, {
      status: error instanceof TreasuryFeedError && error.kind === "timeout" ? 504 : 502,
      headers,
    });
  }
}

export async function HEAD() {
  const response = await GET();
  await response.body?.cancel();
  return new Response(null, { status: response.status, headers: response.headers });
}
