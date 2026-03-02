import { isProductionMode } from "./runtime-mode";

let checked = false;

function isEnabled(value: string | undefined) {
  return (value || "").trim().toLowerCase() === "true";
}

function hasConfiguredRpcUrls(value: string | undefined) {
  return (value || "")
    .split(",")
    .some((entry) => entry.trim().length > 0);
}

export function shouldEnforceProductionRuntimeInvariants(
  env: Record<string, string | undefined> = process.env
) {
  return isProductionMode(env);
}

export function assertProductionRuntimeInvariants(context: string) {
  if (checked) return;
  checked = true;

  if (!shouldEnforceProductionRuntimeInvariants()) return;

  const forbiddenEnabled = [
    isEnabled(process.env.NEXT_PUBLIC_USE_MOCKS) ? "NEXT_PUBLIC_USE_MOCKS" : null,
    isEnabled(process.env.NEXT_PUBLIC_E2E) ? "NEXT_PUBLIC_E2E" : null,
    isEnabled(process.env.NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK)
      ? "NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK"
      : null,
  ].filter((entry): entry is string => entry !== null);

  const violations: string[] = [];

  if (forbiddenEnabled.length > 0) {
    violations.push(
      `Forbidden production flags enabled: ${forbiddenEnabled.join(", ")}.`
    );
  }

  if (!hasConfiguredRpcUrls(process.env.NEXT_PUBLIC_RPC_URLS)) {
    violations.push(
      "NEXT_PUBLIC_RPC_URLS must include at least one non-empty RPC URL."
    );
  }

  if (violations.length === 0) return;

  throw new Error(`[Security Invariant: ${context}] ${violations.join(" ")}`);
}
