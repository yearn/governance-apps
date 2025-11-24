"use client";

export type MockScenario =
  | "standard"
  | "active"
  | "ready"
  | "caps-exhausted";

export function getMockScenario(): MockScenario {
  const raw = (process.env.NEXT_PUBLIC_SCENARIO || "standard").toLowerCase();
  if (raw === "active" || raw === "ready" || raw === "caps-exhausted") {
    return raw;
  }
  return "standard";
}
