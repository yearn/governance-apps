import { describe, it, expect } from "vitest";
import { normalizeTxError } from "@/lib/tx/errors";

describe("normalizeTxError", () => {
  it("maps user rejection", () => {
    const err = normalizeTxError({ name: "UserRejectedRequestError" });
    expect(err.code).toBe("user_rejected");
  });

  it("maps cap exceeded errors from raw strings", () => {
    const err = normalizeTxError("Limit exceeded");
    expect(err.code).toBe("cap_exceeded");
  });

  it("maps cooldown errors", () => {
    const err = normalizeTxError(new Error("Cooldown not complete"));
    expect(err.code).toBe("cooldown_not_ready");
  });

  it("maps insufficient balance errors", () => {
    const err = normalizeTxError(new Error("Insufficient balance"));
    expect(err.code).toBe("insufficient_balance");
  });

  it("maps yETH empty-claim failures to insufficient balance", () => {
    const err = normalizeTxError(new Error("Nothing claimable"));
    expect(err.code).toBe("insufficient_balance");
    expect(err.message).toContain("yETH recovery");
  });

  it("maps yETH empty-share redeem failures to insufficient balance", () => {
    const err = normalizeTxError(new Error("No recovery vault shares to redeem"));
    expect(err.code).toBe("insufficient_balance");
    expect(err.message).toContain("Recovery Vault shares");
  });

  it("maps yETH vault-liquidity failures to revert", () => {
    const err = normalizeTxError(new Error("Insufficient vault liquidity"));
    expect(err.code).toBe("revert");
    expect(err.message).toContain("vault liquidity");
  });

  it("maps transport failures to network errors", () => {
    const err = normalizeTxError(new Error("HTTP request failed"));
    expect(err.code).toBe("network");
    expect(err.message).toContain("Network issue");
  });
});
