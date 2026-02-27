import { parseAbi, parseAbiItem, toEventSelector } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed sender, address indexed receiver, uint256 value)",
);

export const ERC4626_DEPOSIT_EVENT = parseAbiItem(
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
);

export const ERC4626_WITHDRAW_EVENT = parseAbiItem(
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
);

export const LIQUID_LOCKER_REDEEM_EVENT = parseAbiItem(
  "event Redeem(address indexed token, uint256 amount, uint256 fee)",
);

export const LIQUID_LOCKER_EXCHANGE_EVENT = parseAbiItem(
  "event Exchange(address indexed token, uint256 amount)",
);

export const VEYFI_DISTRIBUTOR_MIGRATE_EVENT = parseAbiItem(
  "event Migrate(address indexed account, uint256 unlock_epoch, uint256 amount)",
);

export const LEGACY_VEYFI_MODIFY_LOCK_EVENT = parseAbiItem(
  "event ModifyLock(address indexed sender, address indexed user, uint256 amount, uint256 locktime, uint256 ts)",
);

export const LEGACY_VEYFI_WITHDRAW_EVENT = parseAbiItem(
  "event Withdraw(address indexed provider, uint256 value, uint256 ts, uint256 penalty)",
);

export const LEGACY_VEYFI_PENALTY_EVENT = parseAbiItem(
  "event Penalty(address indexed sender, address indexed receiver, uint256 amount)",
);

export const LEGACY_VEYFI_LOCKED_ABI = parseAbi([
  "function locked(address) view returns (int128 amount, uint256 end)",
] as const);
export const ERC20_BALANCE_OF_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
] as const);

export const ERC20_TRANSFER_ABI = [ERC20_TRANSFER_EVENT] as const;
export const ERC4626_DEPOSIT_ABI = [ERC4626_DEPOSIT_EVENT] as const;
export const ERC4626_WITHDRAW_ABI = [ERC4626_WITHDRAW_EVENT] as const;
export const LIQUID_LOCKER_REDEEM_ABI = [LIQUID_LOCKER_REDEEM_EVENT] as const;
export const LIQUID_LOCKER_EXCHANGE_ABI = [LIQUID_LOCKER_EXCHANGE_EVENT] as const;
export const VEYFI_DISTRIBUTOR_MIGRATE_ABI = [
  VEYFI_DISTRIBUTOR_MIGRATE_EVENT,
] as const;
export const LEGACY_VEYFI_MODIFY_LOCK_ABI = [
  LEGACY_VEYFI_MODIFY_LOCK_EVENT,
] as const;
export const LEGACY_VEYFI_WITHDRAW_ABI = [LEGACY_VEYFI_WITHDRAW_EVENT] as const;
export const LEGACY_VEYFI_PENALTY_ABI = [LEGACY_VEYFI_PENALTY_EVENT] as const;

export const ERC20_TRANSFER_TOPIC = toEventSelector(ERC20_TRANSFER_EVENT);
export const ERC4626_DEPOSIT_TOPIC = toEventSelector(ERC4626_DEPOSIT_EVENT);
export const ERC4626_WITHDRAW_TOPIC = toEventSelector(ERC4626_WITHDRAW_EVENT);
export const LIQUID_LOCKER_REDEEM_TOPIC = toEventSelector(
  LIQUID_LOCKER_REDEEM_EVENT,
);
export const LIQUID_LOCKER_EXCHANGE_TOPIC = toEventSelector(
  LIQUID_LOCKER_EXCHANGE_EVENT,
);
export const VEYFI_DISTRIBUTOR_MIGRATE_TOPIC = toEventSelector(
  VEYFI_DISTRIBUTOR_MIGRATE_EVENT,
);
export const LEGACY_VEYFI_MODIFY_LOCK_TOPIC = toEventSelector(
  LEGACY_VEYFI_MODIFY_LOCK_EVENT,
);
export const LEGACY_VEYFI_WITHDRAW_TOPIC = toEventSelector(
  LEGACY_VEYFI_WITHDRAW_EVENT,
);
export const LEGACY_VEYFI_PENALTY_TOPIC = toEventSelector(
  LEGACY_VEYFI_PENALTY_EVENT,
);

export const MONITORED_EVENT_TOPICS = [
  ERC20_TRANSFER_TOPIC,
  ERC4626_DEPOSIT_TOPIC,
  ERC4626_WITHDRAW_TOPIC,
  LIQUID_LOCKER_REDEEM_TOPIC,
  LIQUID_LOCKER_EXCHANGE_TOPIC,
  VEYFI_DISTRIBUTOR_MIGRATE_TOPIC,
  LEGACY_VEYFI_MODIFY_LOCK_TOPIC,
  LEGACY_VEYFI_WITHDRAW_TOPIC,
  LEGACY_VEYFI_PENALTY_TOPIC,
] as const;
