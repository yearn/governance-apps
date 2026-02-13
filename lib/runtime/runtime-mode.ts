export type RuntimeMode = "development" | "preview" | "production";

type EnvLike = Record<string, string | undefined>;

const RUNTIME_MODE_ALIASES: Record<string, RuntimeMode> = {
  dev: "development",
  development: "development",
  local: "development",
  preview: "preview",
  staging: "preview",
  prod: "production",
  production: "production",
};

function normalize(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

function parseMode(value: string | undefined): RuntimeMode | null {
  const normalized = normalize(value);
  if (!normalized) return null;
  return RUNTIME_MODE_ALIASES[normalized] ?? null;
}

export function resolveRuntimeMode(env: EnvLike = process.env): RuntimeMode {
  const explicitMode = parseMode(env.NEXT_PUBLIC_RUNTIME_MODE);
  if (explicitMode) {
    return explicitMode;
  }

  const deploymentMode = [env.VERCEL_ENV, env.CF_PAGES_ENV, env.DEPLOYMENT_ENV]
    .map(parseMode)
    .find((entry): entry is RuntimeMode => entry !== null);
  if (deploymentMode) {
    return deploymentMode;
  }

  return normalize(env.NODE_ENV) === "production" ? "production" : "development";
}

export function isProductionMode(env: EnvLike = process.env): boolean {
  return resolveRuntimeMode(env) === "production";
}
