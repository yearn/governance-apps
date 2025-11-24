type NormalizedError = {
  code:
    | "user_rejected"
    | "cooldown_not_ready"
    | "cap_exceeded"
    | "insufficient_balance"
    | "network"
    | "unknown";
  message: string;
};

export function normalizeTxError(raw: unknown): NormalizedError {
  if (!raw) return { code: "unknown", message: "Something went wrong" };

  const maybeObj =
    typeof raw === "object" && raw !== null
      ? (raw as { shortMessage?: string; message?: string; name?: string })
      : null;

  const text = (
    maybeObj?.shortMessage || maybeObj?.message || String(raw)
  ).toLowerCase();

  if (maybeObj?.name === "UserRejectedRequestError" || text.includes("rejected")) {
    return { code: "user_rejected", message: "Transaction cancelled." };
  }

  if (text.includes("cooldown") || text.includes("not complete")) {
    return {
      code: "cooldown_not_ready",
      message: "Cooldown isn’t ready yet.",
    };
  }

  if (text.includes("cap") && text.includes("exceed")) {
    return {
      code: "cap_exceeded",
      message: "Redemption cap reached. Try a smaller amount or later.",
    };
  }

  if (text.includes("insufficient")) {
    return {
      code: "insufficient_balance",
      message: "Insufficient balance for this action.",
    };
  }

  if (text.includes("network") || text.includes("rpc")) {
    return { code: "network", message: "Network issue. Please retry." };
  }

  return { code: "unknown", message: maybeObj?.shortMessage || maybeObj?.message || "Something went wrong" };
}
