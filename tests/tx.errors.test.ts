import { describe, it, expect } from "vitest";
import { normalizeTxError } from "@/lib/tx/errors";

describe("normalizeTxError", () => {
  it("maps user rejection", () => {
    const err = normalizeTxError({ name: "UserRejectedRequestError" });
    expect(err.code).toBe("user_rejected");
  });

  it("maps cooldown errors", () => {
    const err = normalizeTxError(new Error("Cooldown not complete"));
    expect(err.code).toBe("cooldown_not_ready");
  });

  it("maps cap exceeded errors", () => {
    const err = normalizeTxError(new Error("Redemption cap exceeded"));
    expect(err.code).toBe("cap_exceeded");
  });

  it("maps insufficient balance errors", () => {
    const err = normalizeTxError(new Error("Insufficient balance"));
    expect(err.code).toBe("insufficient_balance");
  });

  it("maps network errors", () => {
    const err = normalizeTxError(new Error("RPC network down"));
    expect(err.code).toBe("network");
  });

  it("maps revert errors", () => {
    const err = normalizeTxError(new Error("execution reverted"));
    expect(err.code).toBe("revert");
  });
});
