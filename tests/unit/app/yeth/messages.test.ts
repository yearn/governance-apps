import { describe, expect, it } from "vitest";
import { yethCopy } from "@/app/yeth/messages";

describe("yethCopy", () => {
  it("builds a dynamic claim-and-exit label", () => {
    expect(yethCopy.actions.exit.cta("4.2500")).toBe("Claim 4.2500 ETH & Exit");
  });

  it("builds a dynamic cash-out label", () => {
    expect(yethCopy.actions.redeem("4.2500")).toBe("Cash out 4.2500 ETH");
  });

  it("uses settlement framing for staying state", () => {
    expect(yethCopy.postClaim.stayingTitle).toBe("Recovery Position");
    expect(yethCopy.postClaim.valueLabel).toBe("Liquidation Value");
  });
});
