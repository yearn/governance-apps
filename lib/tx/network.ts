import type { Address } from "viem";

export const MAINNET_CHAIN_ID = 1;

export type MainnetAccount = {
  address?: Address;
  chainId?: number;
};

export function assertMainnetAccount(account: MainnetAccount): Address {
  if (!account.address) {
    throw new Error("No account connected");
  }
  if (account.chainId !== MAINNET_CHAIN_ID) {
    throw new Error("Wrong network. Please switch to Ethereum Mainnet.");
  }
  return account.address;
}
