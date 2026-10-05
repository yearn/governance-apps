import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dao-data/route";
import { DAO_FEED_REQUEST_TIMEOUT_MS } from "@/lib/clients/dao/feed";
import { DAO_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/dao-feed";
import { renderCatalogueMessages } from "@/workers/alerts-bot/src/catalogue";
import { DaoAlertContentReader, DAO_APP_FEED_URL, DAO_CONTENT_RETRY_MS } from "@/workers/alerts-bot/src/domains/dao/content";
import { renderDaoAlert } from "@/workers/alerts-bot/src/domains/dao/renderer";
import { daoAction, daoRpc, hash } from "./alerts-bot.dao-fixtures";
import { ContentStorage, contentProposal, daoContentFeed } from "./alerts-bot.dao-content-fixtures";

const expectedContent = {
  title: "Fund research", summary: "Publish the research results.", discussionUrl: "https://gov.yearn.fi/t/research/123",
};
function respond(value: unknown) { return new Response(JSON.stringify(value)); }
function setup(feed = daoContentFeed(), storage = new ContentStorage()) {
  const app = { fetch: vi.fn(async () => respond(feed)) };
  return { app, storage, reader: new DaoAlertContentReader(app, storage) };
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("DAO website feed content", () => {
  it("uses the website proxy and its configured upstream, without another URL or any IPFS request", async () => {
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DAO", "true");
    vi.stubEnv("DAO_DATA_URL", "https://configured.example/dao.json");
    const upstream = vi.fn(async () => respond(daoContentFeed()));
    vi.stubGlobal("fetch", upstream);
    const app = { fetch: vi.fn(async () => GET()) };
    const reader = new DaoAlertContentReader(app, new ContentStorage());
    expect(await reader.read(contentProposal)).toEqual(expectedContent);
    expect(app.fetch).toHaveBeenCalledWith(DAO_APP_FEED_URL, expect.objectContaining({ redirect: "manual", signal: expect.any(AbortSignal) }));
    expect(upstream).toHaveBeenCalledOnce();
    expect(upstream).toHaveBeenCalledWith("https://configured.example/dao.json", expect.anything());
  });

  it("keeps verified titles across object restarts and feed outages", async () => {
    const { reader, storage } = setup();
    expect(await reader.read(contentProposal)).toEqual(expectedContent);
    const failedApp = { fetch: vi.fn().mockRejectedValue(new Error("offline")) };
    const restarted = new DaoAlertContentReader(failedApp, storage);
    expect(await restarted.read(contentProposal)).toEqual(expectedContent);
    expect(failedApp.fetch).not.toHaveBeenCalled();
    // A different chain commitment cannot reuse the old title.
    await expect(restarted.read({ ...contentProposal, digest: hash(9) })).rejects.toMatchObject({ code: "dao_content_feed_unavailable" });
  });

  it("fetches once for multiple uncached proposals in one run", async () => {
    const feed = daoContentFeed();
    const second = { ...feed.proposals[0]!, id: "1", events: feed.proposals[0]!.events.map(e => ({
      ...e, log: { ...e.log, logIndex: e.log.logIndex + 100 },
    })) };
    feed.proposals.push(second);
    feed.deployments[0]!.proposalCount = "2";
    const { reader, app } = setup(feed);
    expect(await reader.read(contentProposal)).toEqual(expectedContent);
    expect(await reader.read({ ...contentProposal, id: "1" })).toEqual(expectedContent);
    expect(app.fetch).toHaveBeenCalledOnce();
  });

  it.each(["chain", "voting", "digest"])("rejects mismatched %s identity", async kind => {
    const feed = daoContentFeed();
    if (kind === "chain") feed.chainId = 10;
    if (kind === "voting") {
      feed.deployments[0]!.votingAddress = "0x1111111111111111111111111111111111111111";
      feed.proposals[0]!.votingAddress = feed.deployments[0]!.votingAddress;
    }
    if (kind === "digest") feed.proposals[0]!.contentDigest = hash(9);
    const { reader } = setup(feed);
    await expect(reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_identity_mismatch" });
  });

  it.each(["absent", "null", "invalid"])("retries %s content without accepting another proposal or unverified bytes", async kind => {
    const feed = daoContentFeed();
    if (kind === "absent") { feed.proposals = []; feed.deployments[0]!.proposalCount = "0"; }
    if (kind === "null") feed.proposals[0]!.contentBytes = null;
    if (kind === "invalid") feed.proposals[0]!.contentBytes = btoa("forged title");
    const { reader, storage } = setup(feed);
    await expect(reader.read(contentProposal)).rejects.toMatchObject({ code: kind === "invalid" ? "dao_content_invalid" : "dao_content_missing" });
    expect(await setup(daoContentFeed(), storage).reader.read(contentProposal)).toEqual(expectedContent);
  });

  it.each(["HTTP", "malformed", "version"])("retries a %s feed failure", async kind => {
    const { reader, app } = setup();
    app.fetch.mockResolvedValueOnce(kind === "HTTP" ? new Response("unavailable", { status: 503 })
      : kind === "version" ? respond({ schema: "yearn.dao.feed.v1" }) : new Response("bad JSON"));
    await expect(reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_feed_unavailable" });
  });

  it.each([301, 302, 307, 308])("rejects HTTP %s without following redirects away from the bound website", async status => {
    const { reader, app } = setup();
    app.fetch.mockResolvedValueOnce(new Response(null, { status, headers: { location: "https://other.example/dao.json" } }));
    await expect(reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_feed_unavailable" });
    expect(app.fetch).toHaveBeenCalledExactlyOnceWith(DAO_APP_FEED_URL, expect.objectContaining({ redirect: "manual" }));
  });

  it.each(["request", "response", "validation"])("logs safe diagnostics for a %s failure", async stage => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { reader, app } = setup();
    if (stage === "request") app.fetch.mockRejectedValueOnce(new TypeError("private upstream credentials"));
    else app.fetch.mockResolvedValueOnce(new Response("private upstream credentials", { status: stage === "response" ? 503 : 200 }));
    await expect(reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_feed_unavailable" });
    expect(warn).toHaveBeenCalledExactlyOnceWith(JSON.stringify({
      event: "dao_content_feed_failed", stage,
      httpStatus: stage === "request" ? null : stage === "response" ? 503 : 200,
      kind: stage === "request" ? "type_error" : stage === "response" ? "http" : "invalid_json",
    }));
  });

  it.each(["headers", "body"])("bounds a service timeout during %s", async phase => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const app = { fetch: vi.fn(() => phase === "headers" ? new Promise<Response>(() => undefined)
      : Promise.resolve(new Response(new ReadableStream({ cancel })))) };
    const reader = new DaoAlertContentReader(app, new ContentStorage());
    const rejected = expect(reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_feed_unavailable" });
    await vi.advanceTimersByTimeAsync(DAO_FEED_REQUEST_TIMEOUT_MS);
    await rejected;
    if (phase === "body") expect(cancel).toHaveBeenCalled();
  });

  it.each([true, false])("bounds service payload bytes (declared: %s)", async declared => {
    const cancel = vi.fn();
    const app = { fetch: vi.fn(async () => new Response(new ReadableStream({
      start(controller) { if (!declared) controller.enqueue(new Uint8Array(DAO_FEED_MAX_PAYLOAD_BYTES + 1)); }, cancel,
    }), { headers: declared ? { "content-length": String(DAO_FEED_MAX_PAYLOAD_BYTES + 1) } : {} })) };
    await expect(new DaoAlertContentReader(app, new ContentStorage()).read(contentProposal)).rejects.toMatchObject({ code: "dao_content_feed_unavailable" });
    expect(cancel).toHaveBeenCalled();
  });

  it("bounds retries across restarts and resumes enrichment when missing content returns", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const feed = daoContentFeed();
    feed.proposals[0]!.contentBytes = null;
    const { reader, storage } = setup(feed);
    await expect(reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_missing" });
    await vi.advanceTimersByTimeAsync(DAO_CONTENT_RETRY_MS - 1);
    await expect(setup(feed, storage).reader.read(contentProposal)).rejects.toMatchObject({ code: "dao_content_missing" });
    await vi.advanceTimersByTimeAsync(1);
    expect(await setup(feed, storage).reader.read(contentProposal)).toBeNull();
    expect(warn).toHaveBeenCalledWith(JSON.stringify({ event: "dao_content_unavailable", proposalId: "0", reason: "dao_content_missing" }));
    expect(renderDaoAlert(daoAction("vote"), null)).toContain("Proposal title unavailable");
    expect(await setup(daoContentFeed(), storage).reader.read(contentProposal)).toEqual(expectedContent);
  });

  it("reports a missing service binding instead of silently using a different source", async () => {
    await expect(new DaoAlertContentReader(undefined, new ContentStorage()).read(contentProposal)).rejects.toMatchObject({ code: "dao_content_service_missing" });
  });
});

describe("DAO proposal identity in delivered messages", () => {
  const events = ["proposed", "vote", "retracted", "flagged", "vetoed", "executed", "discussion_ending", "voting_open", "voting_ending", "vote_decay", "approved", "rejected", "vetoed_result", "execution_ready", "execution_ending", "expired"] as const;
  it.each(events)("loads the feed title for %s through the real catalogue", async event => {
    const action = daoAction(event, contentProposal);
    const { rpc } = daoRpc({ startTime: action.timestamp });
    const { reader } = setup();
    const messages = await renderCatalogueMessages({ domainId: "dao", actions: [action], rpc, daoContent: reader });
    expect(messages[0]!.html).toContain("<b>Fund research</b>");
    expect(messages[0]!.html).toContain("Proposal #0");
    expect(messages[0]!.html.includes("Publish the research results.")).toBe(event === "proposed");
    expect(messages[0]!.html).not.toContain("Author: DAO contributors");
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
