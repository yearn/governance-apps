import { isProductionMode } from "./runtime-mode";

function isEnabled(value: string | undefined) {
  return (value || "").trim().toLowerCase() === "true";
}

export function isProductionRuntime(
  env: Record<string, string | undefined> = process.env
) {
  return isProductionMode(env);
}

export function isYethEnabled(env: Record<string, string | undefined> = process.env) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_YETH);
}

export function isYbcEnabled(env: Record<string, string | undefined> = process.env) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_YBC);
}

export function isDebugUiEnabled(
  env: Record<string, string | undefined> = process.env
) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_DEBUG_UI);
}

export function isSimulationTransportFallbackEnabled(
  env: Record<string, string | undefined> = process.env
) {
  return isEnabled(env.NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK);
}
