import deployment from "../../../lib/deployment.json";
import type { Address } from "viem";

export interface LiquidLockerContract {
  readonly index: number;
  readonly name: string;
  readonly symbol: string;
  readonly token: Address;
  readonly depositor: Address;
  readonly scale: bigint;
}

function assertLiquidLockerColumns(): void {
  const columns = deployment.LIQUID_LOCKERS;
  const expectedLength = columns.NAME.length;
  const actualLengths = [
    columns.SYMBOL.length,
    columns.TOKEN.length,
    columns.DEPOSITOR.length,
    columns.SCALE.length,
  ];

  if (actualLengths.some((length) => length !== expectedLength)) {
    throw new Error("deployment.json LIQUID_LOCKERS columns have mismatched lengths");
  }
}

function toSymbol(prefix: string): string {
  return `${prefix}YFI`;
}

assertLiquidLockerColumns();

export const YFI = deployment.YFI as Address;
export const STYFI = deployment.STYFI as Address;
export const STYFIX = deployment.STYFIX as Address;
export const VEYFI = deployment.VEYFI as Address;
export const VEYFI_REWARD_DISTRIBUTOR =
  deployment.VEYFI_REWARD_DISTRIBUTOR as Address;
export const LIQUID_LOCKER_REDEMPTION =
  deployment.LIQUID_LOCKER_REDEMPTION as Address;

export const LIQUID_LOCKERS: readonly LiquidLockerContract[] =
  deployment.LIQUID_LOCKERS.NAME.map((name, index) => ({
    index,
    name,
    symbol: toSymbol(deployment.LIQUID_LOCKERS.SYMBOL[index]),
    token: deployment.LIQUID_LOCKERS.TOKEN[index] as Address,
    depositor: deployment.LIQUID_LOCKERS.DEPOSITOR[index] as Address,
    scale: BigInt(deployment.LIQUID_LOCKERS.SCALE[index]),
  }));

export const LIQUID_LOCKER_TOKENS = LIQUID_LOCKERS.map((locker) => locker.token);
export const LIQUID_LOCKER_DEPOSITORS = LIQUID_LOCKERS.map(
  (locker) => locker.depositor,
);

export const LIQUID_LOCKER_BY_DEPOSITOR = new Map<string, LiquidLockerContract>(
  LIQUID_LOCKERS.map((locker) => [locker.depositor.toLowerCase(), locker]),
);

export const LIQUID_LOCKER_SYMBOL_BY_TOKEN = new Map<string, string>(
  LIQUID_LOCKERS.map((locker) => [locker.token.toLowerCase(), locker.symbol]),
);

const monitoredContracts = new Set<string>([
  STYFI,
  STYFIX,
  VEYFI,
  VEYFI_REWARD_DISTRIBUTOR,
  LIQUID_LOCKER_REDEMPTION,
  ...LIQUID_LOCKER_DEPOSITORS,
].map((address) => address.toLowerCase()));

export const MONITORED_CONTRACTS = Array.from(monitoredContracts);
