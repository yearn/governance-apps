import { describe, expect, it, vi } from "vitest";
import { encodeFunctionResult, parseAbi, type Hex } from "viem";

import { renderCatalogueMessages } from "@/workers/alerts-bot/src/catalogue";
import type { RpcClient } from "@/workers/alerts-bot/src/rpc";
import {
  PRODUCT_ALERT_CATALOGUE_FIXTURES,
  PRODUCT_CATALOGUE_BLOCK_HASH,
  PRODUCT_CATALOGUE_BLOCK_NUMBER,
} from "./alerts-bot.product-catalogue-fixtures";

const MULTICALL3_ABI = parseAbi([
  "function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)",
] as const);
const RESOLVER_ABI = parseAbi([
  "function reverse(bytes reverseAddress,uint256 coinType) view returns (string,address,address)",
] as const);

function ensResult(name: string): Hex {
  const inner = encodeFunctionResult({
    abi: RESOLVER_ABI,
    functionName: "reverse",
    result: [
      name,
      "0x4444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555",
    ],
  });
  return encodeFunctionResult({
    abi: MULTICALL3_ABI,
    functionName: "aggregate3",
    result: [{ success: true, returnData: inner }],
  });
}

function teamAdded() {
  const action = PRODUCT_ALERT_CATALOGUE_FIXTURES.find(
    (candidate) => candidate.kind === "team_added",
  )?.action;
  if (action === undefined) throw new Error("team_added_fixture_missing");
  return action;
}

function ybcVote() {
  const action = PRODUCT_ALERT_CATALOGUE_FIXTURES.find(
    (candidate) => candidate.kind === "ybc_vote_cast",
  )?.action;
  if (action === undefined) throw new Error("ybc_vote_fixture_missing");
  return action;
}

function productRpc(names: readonly string[]) {
  const call = vi.fn(async (requests: readonly unknown[], reference: unknown) => {
    expect(reference).toEqual({
      blockHash: PRODUCT_CATALOGUE_BLOCK_HASH,
      requireCanonical: true,
    });
    expect(requests).toHaveLength(names.length);
    return names.map(ensResult);
  });
  return {
    call,
    rpc: {
      getBlockByNumber: async () => ({
        number: PRODUCT_CATALOGUE_BLOCK_NUMBER,
        hash: PRODUCT_CATALOGUE_BLOCK_HASH,
        parentHash: `0x${"a".repeat(64)}`,
        timestamp: 1_790_100_000,
      }),
      call,
    } as unknown as RpcClient,
  };
}

describe("Teams and YBC product account context", () => {
  it("resolves product addresses at the exact event block and renders verified ENS names", async () => {
    const { rpc, call } = productRpc(["frontend-team.eth", "alice.eth"]);

    const [message] = await renderCatalogueMessages({
      domainId: "teams",
      actions: [teamAdded()],
      rpc,
    });

    expect(call).toHaveBeenCalledOnce();
    expect(message?.html).toContain(">frontend-team.eth</a>");
    expect(message?.html).toContain("Owner: <a href=\"https://etherscan.io/address/0x2222222222222222222222222222222222222222\">alice.eth</a>");
  });

  it("falls back to shortened linked addresses when no verified ENS name exists", async () => {
    const { rpc } = productRpc(["", ""]);

    const [message] = await renderCatalogueMessages({
      domainId: "teams",
      actions: [teamAdded()],
      rpc,
    });

    expect(message?.html).toContain(">0x1111…1111</a>");
    expect(message?.html).toContain("Owner: <a href=\"https://etherscan.io/address/0x2222222222222222222222222222222222222222\">0x2222…2222</a>");
  });

  it("passes verified event-block ENS names to YBC renderers", async () => {
    const { rpc } = productRpc(["voter.eth"]);

    const [message] = await renderCatalogueMessages({
      domainId: "ybc",
      actions: [ybcVote()],
      rpc,
    });

    expect(message?.html).toContain(
      "Voter: <a href=\"https://etherscan.io/address/0x2222222222222222222222222222222222222222\">voter.eth</a>",
    );
  });
});
