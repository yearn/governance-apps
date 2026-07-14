import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchActiveStyfiSnapshotProposals,
  filterCurrentStyfiSnapshotProposals,
  getStyfiSnapshotProposalUrl,
  STYFI_SNAPSHOT_SPACE_URL,
  type StyfiSnapshotProposal,
} from "@/lib/clients/styfi/snapshot";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("stYFI Snapshot client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches, validates, and sorts active proposals", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        errors: [],
        data: {
          proposals: [
            {
              id: "0xbbb",
              title: "Later proposal",
              end: 2_000,
              state: "active",
            },
            {
              id: "invalid/path",
              title: "Invalid ID",
              end: 1_500,
              state: "active",
            },
            {
              id: "0xaaa",
              title: "Earlier proposal",
              end: 1_000,
              state: "active",
            },
            {
              id: "0xclosed",
              title: "Closed proposal",
              end: 500,
              state: "closed",
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchActiveStyfiSnapshotProposals()).resolves.toEqual([
      {
        id: "0xaaa",
        title: "Earlier proposal",
        end: 1_000,
        state: "active",
      },
      {
        id: "0xbbb",
        title: "Later proposal",
        end: 2_000,
        state: "active",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hub.snapshot.org/graphql",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as { query: string };
    expect(body.query).toContain('space_in: ["styfi.eth"]');
    expect(body.query).toContain('state: "active"');
  });

  it("rejects unsuccessful and malformed responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(jsonResponse({ data: { proposals: null } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchActiveStyfiSnapshotProposals()).rejects.toThrow(
      "status 429",
    );
    await expect(fetchActiveStyfiSnapshotProposals()).rejects.toThrow(
      "invalid proposal response",
    );
  });

  it("filters expired proposals using their Snapshot end timestamp", () => {
    const proposals: StyfiSnapshotProposal[] = [
      { id: "0xexpired", title: "Expired", end: 1_000, state: "active" },
      { id: "0xopen", title: "Open", end: 2_000, state: "active" },
    ];

    expect(filterCurrentStyfiSnapshotProposals(proposals, 1_500_000)).toEqual([
      proposals[1],
    ]);
  });

  it("builds fixed-origin proposal links and rejects unsafe IDs", () => {
    expect(getStyfiSnapshotProposalUrl("0xabc123")).toBe(
      `${STYFI_SNAPSHOT_SPACE_URL}proposal/0xabc123`,
    );
    expect(() => getStyfiSnapshotProposalUrl("../unsafe")).toThrow(
      "Invalid Snapshot proposal ID",
    );
  });
});
