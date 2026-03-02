import type { Address } from "viem";
import deployment from "./deployment.json";

export const YETH_CLAIM = deployment.YETH_CLAIM as Address;
export const YETH_YIELD_VAULT = deployment.YETH_YIELD_VAULT as Address;
export const YETH_RECOVERY_VAULT = deployment.YETH_RECOVERY_VAULT as Address;

export const YETH_MULTICALL3 = deployment.MULTICALL3 as Address;
export const YETH_CLAIM_DEPLOY_BLOCK = deployment.YETH_CLAIM_DEPLOY_BLOCK;
export const YETH_RECOVERY_VAULT_DEPLOY_BLOCK =
  deployment.YETH_RECOVERY_VAULT_DEPLOY_BLOCK;
