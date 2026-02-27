import { describe, expect, it } from "vitest";
import { createRpcClient } from "@/workers/alerts-bot/src/rpc";

describe("alerts-bot rpc client", () => {
  it("invokes fetch with globalThis binding", async () => {
    let called = false;

    const fetchImpl = function (
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      called = true;
      expect(this).toBe(globalThis);
      expect(String(input)).toBe("https://rpc.example");
      expect(init?.method).toBe("POST");
      return Promise.resolve(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: "0x1",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );
    };

    const rpc = createRpcClient(
      "https://rpc.example",
      fetchImpl as unknown as typeof fetch,
    );
    const blockNumber = await rpc.getBlockNumber();

    expect(called).toBe(true);
    expect(blockNumber).toBe(1);
  });
});
