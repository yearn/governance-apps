/** Keep provider error details (which can contain connection URIs) out of the UI. */
export function walletErrorMessage(error: unknown, action: "connect" | "switch" | "disconnect"): string {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth += 1) {
    const value = current as { code?: unknown; name?: unknown; cause?: unknown };
    if (value.code === "WALLET_REQUEST_PENDING") {
      return "A previous connection request is still pending. Reject it in your wallet, or wait for it to expire, then try again.";
    }
    if (value.code === 4001 || value.name === "UserRejectedRequestError") {
      return "Request declined in your wallet. You can try again.";
    }
    if (value.code === -32002) {
      return "A request is already open in your wallet. Open your wallet to continue or dismiss it.";
    }
    if (value.code === 4902) {
      return "This network is not available in your wallet. Add Ethereum Mainnet in your wallet, then try again.";
    }
    current = value.cause;
  }
  if (action === "switch") return "Could not switch networks. Open your wallet and select Ethereum Mainnet, then try again.";
  if (action === "disconnect") return "Could not disconnect. Try again, or disconnect this site in your wallet.";
  return "Could not connect to your wallet. Check your wallet and internet connection, then try again.";
}

/** Source-verified wallet routes. Navigation happens only on an explicit link click. */
export function walletLaunchUrl(wallet: "metamask" | "rabby", uri: string): string | undefined {
  if (uri.length > 4096 || !/^wc:[a-f0-9]{64}@2\?/i.test(uri)) return undefined;
  const prefix = wallet === "metamask" ? "metamask://wc" : "rabby://walletconnect";
  return `${prefix}?uri=${encodeURIComponent(uri)}`;
}
