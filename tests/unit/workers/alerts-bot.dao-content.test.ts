import { afterEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "viem";
import { canonicalizeDaoProposalContent } from "@/lib/clients/dao/content";
import { DAO_CONTENT_MAX_BYTES } from "@/lib/schemas/dao-feed";
import { readDaoAlertContent } from "@/workers/alerts-bot/src/domains/dao/content";
import { renderDaoAlert } from "@/workers/alerts-bot/src/domains/dao/renderer";
import { ACCOUNT, daoAction, hash } from "./alerts-bot.dao-fixtures";

const bytes = canonicalizeDaoProposalContent({
  schema: "yearn.dao.proposal.v1", markdown: "# Fund research\n\nPublish the research results.\n\n## Specification\n\nApprove the budget.\n",
  discussionUrl: "https://gov.yearn.fi/t/research/123", proposalType: "signal", createdBy: ACCOUNT,
  createdAt: "2026-10-02T12:00:00.000Z", assets: [],
});

afterEach(() => vi.unstubAllGlobals());

describe("DAO optional content", () => {
  it("uses a fixed gateway and the committed digest before rendering content", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(new TextDecoder().decode(bytes)));
    vi.stubGlobal("fetch", fetcher);
    expect(await readDaoAlertContent(sha256(bytes))).toEqual({ title: "Fund research", summary: "Publish the research results.", discussionUrl: "https://gov.yearn.fi/t/research/123" });
    expect(fetcher.mock.calls[0]![0]).toMatch(/^https:\/\/ipfs.io\/ipfs\/bafk/);
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ redirect: "error" });
  });

  it("discards incorrect content without blocking an alert", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new TextDecoder().decode(bytes))));
    const content = await readDaoAlertContent(hash(1));
    expect(content).toBeNull();
    expect(renderDaoAlert(daoAction("proposed"), content)).toContain("New DAO proposal");
  });

  it("cancels oversized streamed bodies without trusting Content-Length", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(DAO_CONTENT_MAX_BYTES + 1)); }, cancel,
    }))));
    expect(await readDaoAlertContent(hash(1))).toBeNull();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each(["offline", "timeout", "invalid JSON"])("keeps %s enrichment failures local", async kind => {
    const fetcher = vi.fn();
    if (kind === "invalid JSON") fetcher.mockResolvedValue(new Response("garbage"));
    else fetcher.mockRejectedValue(new Error(kind));
    vi.stubGlobal("fetch", fetcher);
    expect(await readDaoAlertContent(hash(1))).toBeNull();
  });

  it("bounds entity expansion and optional long discussion links", () => {
    const html = renderDaoAlert(daoAction("proposed"), {
      title: "&".repeat(140), summary: "&".repeat(500), discussionUrl: `https://gov.yearn.fi/${"a".repeat(2_000)}`,
    });
    expect(html.length).toBeLessThanOrEqual(4_096);
    expect(html).not.toContain(">Discussion</a>");
    expect(html).not.toMatch(/&(?:am|a|amp)(?:…|<)/);
    expect(renderDaoAlert(daoAction("proposed"), {
      title: "&".repeat(140), summary: "&".repeat(500), discussionUrl: `https://gov.yearn.fi/t/123?q=${"&".repeat(480)}`,
    })).not.toContain(">Discussion</a>");
  });
});
