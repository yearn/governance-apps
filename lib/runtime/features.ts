import { isProductionMode } from "./runtime-mode";

type FeatureEnv = Record<string, string | undefined>;

// Keep these direct references so Next can embed public flags in client chunks.
// Passing `process.env` through a default parameter leaves the browser-side env
// object empty in production and would incorrectly fall back to development.
function getPublicFeatureEnv(): FeatureEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_RUNTIME_MODE: process.env.NEXT_PUBLIC_RUNTIME_MODE,
    NEXT_PUBLIC_ENABLE_DAO: process.env.NEXT_PUBLIC_ENABLE_DAO,
    NEXT_PUBLIC_ENABLE_TEAMS: process.env.NEXT_PUBLIC_ENABLE_TEAMS,
    NEXT_PUBLIC_ENABLE_YBC: process.env.NEXT_PUBLIC_ENABLE_YBC,
    NEXT_PUBLIC_ENABLE_YETH: process.env.NEXT_PUBLIC_ENABLE_YETH,
    NEXT_PUBLIC_ENABLE_DEBUG_UI: process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI,
    NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK:
      process.env.NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK,
  };
}

function isEnabled(value: string | undefined) {
  return (value || "").trim().toLowerCase() === "true";
}

export function isProductionRuntime(
  env: FeatureEnv = getPublicFeatureEnv()
) {
  return isProductionMode(env);
}

export function isDaoEnabled(
  env: FeatureEnv = getPublicFeatureEnv()
) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_DAO);
}

/**
 * DAO's unaccepted M2 review candidate remains mock-backed in production mode.
 * This is a route-local exception gated by the DAO surface flag, not a global
 * mock mode.
 */
export function isDaoMockRuntimeEnabled(
  env: FeatureEnv = getPublicFeatureEnv()
) {
  return isDaoEnabled(env);
}

export function isYethEnabled(env: FeatureEnv = getPublicFeatureEnv()) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_YETH);
}

export function isTeamsEnabled(
  env: FeatureEnv = getPublicFeatureEnv()
) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_TEAMS);
}

export function isYbcEnabled(env: FeatureEnv = getPublicFeatureEnv()) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_YBC);
}

export function isDebugUiEnabled(
  env: FeatureEnv = getPublicFeatureEnv()
) {
  return !isProductionRuntime(env) || isEnabled(env.NEXT_PUBLIC_ENABLE_DEBUG_UI);
}

export function isSimulationTransportFallbackEnabled(
  env: FeatureEnv = getPublicFeatureEnv()
) {
  return isEnabled(env.NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK);
}
