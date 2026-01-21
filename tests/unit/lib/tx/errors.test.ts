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
});
