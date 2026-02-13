#!/usr/bin/env node
function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function resolveRuntimeMode(env = process.env) {
  const explicit = normalize(env.NEXT_PUBLIC_RUNTIME_MODE);
  if (explicit === "development" || explicit === "preview" || explicit === "production") {
    return explicit;
  }

  const markers = [env.VERCEL_ENV, env.CF_PAGES_ENV, env.DEPLOYMENT_ENV]
    .map(normalize)
    .filter(Boolean);
  if (markers.includes("production")) return "production";
  if (markers.includes("preview") || markers.includes("staging")) return "preview";

  return normalize(env.NODE_ENV) === "production" ? "production" : "development";
}

const isNodeProduction = normalize(process.env.NODE_ENV) === "production";

if (!isNodeProduction) {
  console.log("Skipping production env validation because NODE_ENV is not production.");
  process.exit(0);
}

const errors = [];
const runtimeMode = resolveRuntimeMode(process.env);

if (!process.env.NEXT_PUBLIC_RUNTIME_MODE?.trim()) {
  errors.push(
    "NEXT_PUBLIC_RUNTIME_MODE is required when NODE_ENV=production (set to production for production deployments)."
  );
}

if (runtimeMode !== "production") {
  errors.push(
    `Runtime mode resolved to \"${runtimeMode}\". NEXT_PUBLIC_RUNTIME_MODE must resolve to \"production\" for production validation.`
  );
}

const forbiddenEnabledFlags = [
  "NEXT_PUBLIC_USE_MOCKS",
  "NEXT_PUBLIC_E2E",
];

for (const name of forbiddenEnabledFlags) {
  if ((process.env[name] || "").toLowerCase() === "true") {
    errors.push(`${name} must be false in production.`);
  }
}

const requiredVars = [
  "NEXT_PUBLIC_RUNTIME_MODE",
  "NEXT_PUBLIC_WC_PROJECT_ID",
  "NEXT_PUBLIC_GLOBAL_DATA_URL",
  "NEXT_PUBLIC_MOTD_URL",
];

for (const name of requiredVars) {
  if (!process.env[name] || !process.env[name]?.trim()) {
    errors.push(`${name} is required in production.`);
  }
}

if (errors.length > 0) {
  console.error("Production environment validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Production environment validation passed.");
