import { isProductionMode } from "./runtime-mode";

type EnvLike = Record<string, string | undefined>;

export function isProductionDeployment(env: EnvLike = process.env): boolean {
  return isProductionMode(env);
}

export function shouldSendNoIndexHeader(env: EnvLike = process.env): boolean {
  return !isProductionDeployment(env);
}
