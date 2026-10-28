import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dao-voting-power/route";
import { fetchDaoVotingPowerSnapshot } from "@/lib/clients/dao/voting-power-snapshot";

vi.mock("@/lib/clients/dao/voting-power-snapshot", () => ({ fetchDaoVotingPowerSnapshot: vi.fn() }));
const read = vi.mocked(fetchDaoVotingPowerSnapshot);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_DAO", "true");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_YBC", "false");
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("DAO voting-power proxy", () => {
  it("keeps the proxy disabled when both DAO and YBC rollouts are off", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DAO", "false");
    vi.stubEnv("NEXT_PUBLIC_DAO_VOTING_POWER_URL", "https://data.example/prod/voting-power.json");
    const response = await GET();
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(read).not.toHaveBeenCalled();
  });

  it("allows the YBC overview when only the YBC rollout is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DAO", "false");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_YBC", "true");
    vi.stubEnv("NEXT_PUBLIC_DAO_VOTING_POWER_URL", "https://data.example/power.json");
    read.mockResolvedValue({ version: 1 } as Awaited<ReturnType<typeof read>>);
    expect((await GET()).status).toBe(200);
  });
  it("returns an unavailable response without requesting an unconfigured feed", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAO_VOTING_POWER_URL", "");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(read).not.toHaveBeenCalled();
  });

  it("serves the bounded, validated snapshot without adding a cache lifetime", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAO_VOTING_POWER_URL", "https://data.example/prod/voting-power.json");
    const snapshot = { version: 1, chainId: 1, totals: { totalPower: "10" } };
    read.mockResolvedValue(snapshot as Awaited<ReturnType<typeof read>>);
    const response = await GET();
    expect(read).toHaveBeenCalledWith("https://data.example/prod/voting-power.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(snapshot);
  });

  it.each(["upstream 500", "invalid snapshot sums", "request timeout", "oversized payload"])("redacts upstream failure details: %s", async (reason) => {
    vi.stubEnv("NEXT_PUBLIC_DAO_VOTING_POWER_URL", "https://data.example/prod/voting-power.json");
    read.mockRejectedValue(new Error(`${reason}: private-provider-details`));
    const response = await GET();
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Voting-power feed is unavailable." });
  });
});
