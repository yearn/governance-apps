import { isProductionMode } from "./runtime-mode";

let checked = false;

function isEnabled(value: string | undefined) {
  return (value || "").trim().toLowerCase() === "true";
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
  ].filter((entry): entry is string => entry !== null);

  if (forbiddenEnabled.length === 0) return;

  throw new Error(
    `[Security Invariant: ${context}] Forbidden production flags enabled: ${forbiddenEnabled.join(
      ", "
    )}.`
  );
}
