import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256 } from "viem";
import {
  DAO_METADATA_TIMEOUT_MS,
  daoProposalSharePath,
  readDaoProposalShareDetails,
} from "@/lib/server/dao-proposal-metadata";
import { DAO_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/dao-feed";
import { createV2Example, V2_DEPLOYMENTS, V2_VOTING, v2Base64, v2Content } from "../../../fixtures/dao-feed-v2";

const dataUrl = "https://feeds.example.test/dao.json";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DAO", "true");
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  vi.stubEnv("NEXT_PUBLIC_DAO_DEPLOYMENTS", JSON.stringify(V2_DEPLOYMENTS));
  vi.stubEnv("DAO_DATA_URL", dataUrl);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

function respond(feed = createV2Example()) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(feed)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("DAO proposal social metadata", () => {
  it("reads plain text title and summary from digest-validated proposal content", async () => {
    const feed = createV2Example();
    const bytes = v2Content("# Review **treasury** policy\n\nA [proposal](https://yearn.fi) to document `treasury` decisions.\n\n## Details\n\nRecord the approved policy in the public forum.\n");
    feed.proposals[0].contentBytes = v2Base64(bytes);
    feed.proposals[0].contentDigest = sha256(bytes);
    const fetchMock = respond(feed);
    expect(await readDaoProposalShareDetails({ id: "0" })).toEqual({
      title: "Review treasury policy | Yearn DAO",
      description: "A proposal to document treasury decisions.",
      path: `/proposals/0?chain=1&voting=${V2_VOTING}`,
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(dataUrl,
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
  });

  it("bounds the description to a concise text excerpt", async () => {
    const feed = createV2Example();
    const bytes = v2Content(`# A proposal\n\n${"Treasury policy. ".repeat(18)}\n\n## Details\n\nBody.\n`);
    feed.proposals[0].contentBytes = v2Base64(bytes);
    feed.proposals[0].contentDigest = sha256(bytes);
    respond(feed);
    const result = await readDaoProposalShareDetails({ id: "0" });
    expect(result?.description.endsWith("…")).toBe(true);
    expect(Array.from(result!.description).length).toBeLessThanOrEqual(200);
  });

  it.each(["Summary", "1. Summary"])("prefers the %s section over author attribution", async (heading) => {
    const feed = createV2Example();
    const bytes = v2Content(`# Treasury proposal\n\n**Authors:** DAO-Ops\n\n## ${heading}\n\nThis proposal asks the DAO to:\n\n1. Approve **treasury** funding.\n2. Record expenses.\n\n## References\n\nDo not include later sections.\n`);
    feed.proposals[0].contentBytes = v2Base64(bytes);
    feed.proposals[0].contentDigest = sha256(bytes);
    respond(feed);
    expect(await readDaoProposalShareDetails({ id: "0" })).toHaveProperty("description",
      "This proposal asks the DAO to: Approve treasury funding. Record expenses.");
  });

  it("preserves explicit proposal identity and removes navigation context", async () => {
    respond();
    expect(await readDaoProposalShareDetails({ id: "0", chain: "1", voting: V2_VOTING.toUpperCase().replace("0X", "0x") }))
      .toHaveProperty("path", `/proposals/0?chain=1&voting=${V2_VOTING}`);
    expect(daoProposalSharePath({ id: "0", chain: "1", voting: V2_VOTING }))
      .toBe(`/proposals/0?chain=1&voting=${V2_VOTING}`);
  });

  it.each(["16", "17", "18", "19"])("uses neutral metadata for unavailable or invalid content (proposal %s)", async (id) => {
    respond();
    expect(await readDaoProposalShareDetails({ id })).toMatchObject({
      title: `Proposal #${id} | Yearn DAO`,
      description: `Read proposal #${id} and take part in Yearn DAO governance.`,
      path: `/proposals/${id}?chain=1&voting=${V2_VOTING}`,
    });
  });

  it.each([
    { id: "-1" }, { id: "01" }, { id: "hello" }, { id: (2n ** 256n).toString() },
    { id: "0", chain: "2", voting: V2_VOTING }, { id: "0", chain: "1" },
    { id: "0", voting: V2_VOTING }, { id: "0", chain: ["1", "2"], voting: V2_VOTING },
    { id: "0", chain: "1", voting: "0x9999999999999999999999999999999999999999" },
  ])("rejects invalid or incomplete identities before fetching: %j", async (input) => {
    const fetchMock = respond();
    expect(await readDaoProposalShareDetails(input)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not guess which Voting deployment owns a bare proposal ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAO_DEPLOYMENTS", JSON.stringify([
      ...V2_DEPLOYMENTS,
      { ...V2_DEPLOYMENTS[0], votingAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", active: false },
    ]));
    const fetchMock = respond();
    expect(await readDaoProposalShareDetails({ id: "0" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["disabled", "mock", "unconfigured", "bad-deployments"])("does not fetch in the %s case", async (mode) => {
    if (mode === "disabled") vi.stubEnv("NEXT_PUBLIC_ENABLE_DAO", "false");
    if (mode === "mock") {
      vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "development");
      vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    }
    if (mode === "unconfigured") vi.stubEnv("DAO_DATA_URL", "");
    if (mode === "bad-deployments") vi.stubEnv("NEXT_PUBLIC_DAO_DEPLOYMENTS", "not json");
    const fetchMock = respond();
    expect(await readDaoProposalShareDetails({ id: "0" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back for an absent proposal", async () => {
    respond();
    expect(await readDaoProposalShareDetails({ id: "99999" })).toBeNull();
  });

  it.each(["network", "status", "schema", "oversized", "future"])("falls back without breaking the page on %s failure", async (mode) => {
    const feed = createV2Example();
    if (mode === "future") feed.observedAt = Math.floor(Date.now() / 1000) + 3600;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    if (mode === "network") fetchMock.mockRejectedValue(new Error("offline"));
    else fetchMock.mockResolvedValue(mode === "status" ? new Response(null, { status: 503 })
      : mode === "oversized" ? new Response("{}", { headers: { "content-length": String(DAO_FEED_MAX_PAYLOAD_BYTES + 1) } })
        : new Response(JSON.stringify(mode === "schema" ? { ...feed, schema: "wrong" } : feed)));
    expect(await readDaoProposalShareDetails({ id: "0" })).toBeNull();
  });

  it.each(["headers", "body"])("bounds a slow feed %s read and falls back", async (phase) => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetchMock = vi.fn().mockImplementation(() => phase === "headers" ? new Promise(() => undefined)
      : Promise.resolve(new Response(new ReadableStream({ cancel }))));
    vi.stubGlobal("fetch", fetchMock);
    const request = readDaoProposalShareDetails({ id: "0" });
    await vi.advanceTimersByTimeAsync(DAO_METADATA_TIMEOUT_MS);
    expect(await request).toBeNull();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    if (phase === "body") expect(cancel).toHaveBeenCalled();
  });
});
