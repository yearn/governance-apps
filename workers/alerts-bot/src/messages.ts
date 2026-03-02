import deployment from "../../../lib/deployment.json";
import { LIQUID_LOCKERS } from "./contracts";
import {
  formatAmount,
  formatPercent,
  formatUtcDate,
  shortAddress,
} from "./format";
import type { NormalizedAction } from "./types";

const ETHERSCAN_BASE_URL = "https://etherscan.io";
const EPOCH_LENGTH_SECONDS = 14n * 24n * 60n * 60n;
const GENESIS_SECONDS = BigInt(deployment.GENESIS);
const ONE_YFI = 10n ** 18n;

type LockerPrefix = "SDYFI" | "SUPYFI" | "COVEYFI";
type ImpactTierKey = "info" | "shrimp" | "fish" | "dolphin" | "shark" | "whale";

const LOCKER_SCALE_BY_SYMBOL = new Map<string, bigint>(
  LIQUID_LOCKERS.map((locker) => [locker.symbol.toLowerCase(), locker.scale]),
);

interface ImpactTier {
  key: ImpactTierKey;
  label: string;
  emoji: string;
  meter: string;
  rank: number;
}

export interface ImpactClassification {
  impactYfi: bigint;
  tier: ImpactTier;
}

export interface RedemptionFacilitySnapshot {
  yfiBalance: bigint;
  tokenBalance: bigint;
  tokenSymbol: string;
}

export interface RenderTelegramMessageOptions {
  yfiPriceCents?: bigint | null;
  blockTimestampSeconds?: number | null;
  redemptionFacilitySnapshot?: RedemptionFacilitySnapshot | null;
  ensNamesByAddress?: ReadonlyMap<string, string> | null;
}

interface MessageBlueprint {
  eventEmoji: string;
  title: string;
  lines: string[];
}

const IMPACT_TIERS = {
  info: {
    key: "info",
    label: "Info",
    emoji: "ℹ️",
    meter: "▱▱▱▱▱",
    rank: 0,
  } satisfies ImpactTier,
  shrimp: {
    key: "shrimp",
    label: "Shrimp",
    emoji: "🦐",
    meter: "▰▱▱▱▱",
    rank: 1,
  } satisfies ImpactTier,
  fish: {
    key: "fish",
    label: "Fish",
    emoji: "🐟",
    meter: "▰▰▱▱▱",
    rank: 2,
  } satisfies ImpactTier,
  dolphin: {
    key: "dolphin",
    label: "Dolphin",
    emoji: "🐬",
    meter: "▰▰▰▱▱",
    rank: 3,
  } satisfies ImpactTier,
  shark: {
    key: "shark",
    label: "Shark",
    emoji: "🦈",
    meter: "▰▰▰▰▱",
    rank: 4,
  } satisfies ImpactTier,
  whale: {
    key: "whale",
    label: "Whale",
    emoji: "🐋",
    meter: "▰▰▰▰▰",
    rank: 5,
  } satisfies ImpactTier,
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function areSameAddress(left: string, right: string): boolean {
  return normalizeAddress(left) === normalizeAddress(right);
}

function getAddressDisplayLabel(
  address: string,
  ensNamesByAddress: ReadonlyMap<string, string> | null | undefined,
): string {
  const ensName = ensNamesByAddress?.get(normalizeAddress(address));
  if (ensName && ensName.trim().length > 0) {
    return ensName.trim();
  }

  return shortAddress(address);
}

function buildAddressLink(
  address: string,
  ensNamesByAddress: ReadonlyMap<string, string> | null | undefined,
): string {
  const value = address.trim();
  if (!value.startsWith("0x")) {
    return escapeHtml(value);
  }

  const label = getAddressDisplayLabel(value, ensNamesByAddress);
  return `<a href="${ETHERSCAN_BASE_URL}/address/${value}">${escapeHtml(label)}</a>`;
}

function buildTxLink(txHash: string): string {
  return `<a href="${ETHERSCAN_BASE_URL}/tx/${txHash}">${shortAddress(txHash)}</a>`;
}

function formatIntegerWithThousands(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getLockerPrefix(symbol: string): LockerPrefix | null {
  const normalized = symbol.toLowerCase();
  if (normalized === "sdyfi") {
    return "SDYFI";
  }
  if (normalized === "upyfi" || normalized === "supyfi") {
    return "SUPYFI";
  }
  if (normalized === "coveyfi") {
    return "COVEYFI";
  }
  return null;
}

function getDisplayTokenSymbol(symbol: string): string {
  const normalized = symbol.toLowerCase();
  if (normalized === "upyfi" || normalized === "supyfi") {
    return "supYFI";
  }
  if (normalized === "styfix") {
    return "stYFIx";
  }
  if (normalized === "styfi") {
    return "stYFI";
  }
  if (normalized === "sdyfi") {
    return "sdYFI";
  }
  if (normalized === "coveyfi") {
    return "coveYFI";
  }
  return symbol;
}

function isLockerToken(symbol: string): boolean {
  return getLockerPrefix(symbol) !== null;
}

function toYfiAmountFromToken(tokenSymbol: string, tokenAmount: bigint): bigint {
  const scale = LOCKER_SCALE_BY_SYMBOL.get(tokenSymbol.toLowerCase()) ?? 1n;
  if (scale <= 0n) {
    return tokenAmount;
  }
  return tokenAmount / scale;
}

function toTokenAmountFromYfi(tokenSymbol: string, yfiAmount: bigint): bigint {
  const scale = LOCKER_SCALE_BY_SYMBOL.get(tokenSymbol.toLowerCase()) ?? 1n;
  return yfiAmount * scale;
}

function areEquivalentAtDisplayPrecision(left: bigint, right: bigint): boolean {
  return formatAmount(left) === formatAmount(right);
}

function toUsdCentsFromYfi(yfiAmount: bigint, yfiPriceCents: bigint): bigint {
  const isNegative = yfiAmount < 0n;
  const absolute = isNegative ? -yfiAmount : yfiAmount;
  const roundedCents = (absolute * yfiPriceCents + ONE_YFI / 2n) / ONE_YFI;
  return isNegative ? -roundedCents : roundedCents;
}

function formatUsdCents(cents: bigint): string {
  const isNegative = cents < 0n;
  const absolute = isNegative ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const sign = isNegative ? "-" : "";
  return `${sign}$${formatIntegerWithThousands(whole.toString())}.${fraction}`;
}

function formatUsdForYfi(
  yfiAmount: bigint,
  yfiPriceCents: bigint | null | undefined,
): string {
  if (yfiPriceCents === null || yfiPriceCents === undefined || yfiPriceCents <= 0n) {
    return "";
  }

  const usd = formatUsdCents(toUsdCentsFromYfi(yfiAmount, yfiPriceCents));
  return ` (<b>${usd}</b>)`;
}

function formatSignedAmount(value: bigint): string {
  const sign = value > 0n ? "+" : value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${formatAmount(absolute)}`;
}

function classifyImpactTier(
  impactYfi: bigint,
  forceInfo: boolean,
): ImpactTier {
  if (forceInfo) {
    return IMPACT_TIERS.info;
  }

  if (impactYfi < 1n * ONE_YFI) {
    return IMPACT_TIERS.shrimp;
  }

  if (impactYfi < 5n * ONE_YFI) {
    return IMPACT_TIERS.fish;
  }

  if (impactYfi < 15n * ONE_YFI) {
    return IMPACT_TIERS.dolphin;
  }

  if (impactYfi < 40n * ONE_YFI) {
    return IMPACT_TIERS.shark;
  }

  return IMPACT_TIERS.whale;
}

function getImpactYfi(action: NormalizedAction): bigint {
  if (
    (action.kind === "extension" || action.kind === "update") &&
    action.amounts.previousAmount !== undefined
  ) {
    const current = action.amounts.amount ?? 0n;
    const previous = action.amounts.previousAmount;
    return current >= previous ? current - previous : previous - current;
  }

  if (action.kind === "exchange") {
    return action.amounts.amount ?? 0n;
  }

  if (action.kind === "redeem") {
    const tokenAmount = action.amounts.amount ?? 0n;
    return toYfiAmountFromToken(action.tokenSymbol, tokenAmount);
  }

  if (action.kind === "legacy_withdraw") {
    const withdrawn = action.amounts.amount ?? 0n;
    const penalty = action.amounts.penalty ?? 0n;
    return withdrawn + penalty;
  }

  if (
    action.kind === "staked" ||
    action.kind === "initiated_cooldown" ||
    action.kind === "withdrew_from_cooldown"
  ) {
    const normalizedSymbol = action.tokenSymbol.toLowerCase();
    if (normalizedSymbol === "styfi" || normalizedSymbol === "styfix") {
      return action.amounts.assets ?? 0n;
    }

    const tokenAmount = action.amounts.assets ?? 0n;
    return action.amounts.shares ?? toYfiAmountFromToken(action.tokenSymbol, tokenAmount);
  }

  return action.amounts.amount ?? 0n;
}

function isInfoImpact(action: NormalizedAction): boolean {
  if (action.kind !== "extension" && action.kind !== "update") {
    return false;
  }

  if (action.amounts.previousAmount === undefined) {
    return false;
  }

  const current = action.amounts.amount ?? 0n;
  return current === action.amounts.previousAmount;
}

export function classifyActionImpact(action: NormalizedAction): ImpactClassification {
  const impactYfi = getImpactYfi(action);
  return {
    impactYfi,
    tier: classifyImpactTier(impactYfi, isInfoImpact(action)),
  };
}

function buildImpactLine(
  action: NormalizedAction,
): string {
  const impact = classifyActionImpact(action);

  if (impact.tier.key === "info") {
    return `Impact: <b>${impact.tier.emoji} ${impact.tier.label}</b>`;
  }

  return `Impact: <b>${impact.tier.meter} ${impact.tier.label}</b> (<b>${impact.tier.rank}/5</b>)`;
}

function buildImpactBasisLine(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): string {
  if (action.kind === "redeem") {
    const tokenAmount = action.amounts.amount ?? 0n;
    const feeAmount = action.amounts.fee ?? 0n;
    if (feeAmount <= 0n) {
      return "";
    }

    const grossYfi = toYfiAmountFromToken(action.tokenSymbol, tokenAmount);
    if (grossYfi <= 0n) {
      return "";
    }
    const netYfi = grossYfi > feeAmount ? grossYfi - feeAmount : 0n;

    return `Impact basis: <b>${formatAmount(grossYfi)}</b> YFI${formatUsdForYfi(
      grossYfi,
      options.yfiPriceCents,
    )} gross (net <b>${formatAmount(netYfi)}</b> YFI)`;
  }

  if (action.kind === "legacy_withdraw") {
    const withdrawn = action.amounts.amount ?? 0n;
    const penalty = action.amounts.penalty ?? 0n;
    if (penalty <= 0n) {
      return "";
    }

    const totalImpact = withdrawn + penalty;
    return `Impact basis: <b>${formatAmount(totalImpact)}</b> YFI${formatUsdForYfi(
      totalImpact,
      options.yfiPriceCents,
    )} (withdrawn + penalty)`;
  }

  return "";
}

function buildActorLines(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): string[] {
  const lines: string[] = [];
  const seen: string[] = [];

  const user = action.user;
  const owner = action.owner ?? action.user;
  const receiver = action.receiver ?? action.user;

  const addLine = (label: string, value: string | undefined): void => {
    if (!value) {
      return;
    }

    const duplicate = seen.some((existing) => areSameAddress(existing, value));
    if (duplicate) {
      return;
    }

    seen.push(value);
    lines.push(`${label}: ${buildAddressLink(value, options.ensNamesByAddress)}`);
  };

  if (areSameAddress(user, owner) && areSameAddress(user, receiver)) {
    addLine("Account", user);
  } else {
    addLine("Account", user);
    if (!areSameAddress(owner, user)) {
      addLine("Owner", owner);
    }
    if (!areSameAddress(receiver, user) && !areSameAddress(receiver, owner)) {
      addLine("Receiver", receiver);
    }
  }

  if (action.caller) {
    addLine("Caller", action.caller);
  }

  return lines;
}

function buildFooterLine(action: NormalizedAction, timestampSeconds: number | null): string {
  const block = action.blockNumber.toLocaleString("en-US");
  const fallbackTimestamp = "Unknown UTC";
  const timestampValue =
    timestampSeconds === null || !Number.isFinite(timestampSeconds) || timestampSeconds < 0
      ? fallbackTimestamp
      : formatUtcDate(BigInt(Math.floor(timestampSeconds)));
  return `<i>Block ${block} • ${timestampValue}</i>`;
}

function buildFacilityLine(snapshot: RedemptionFacilitySnapshot | null | undefined): string {
  if (!snapshot) {
    return "";
  }

  const tokenSymbol = escapeHtml(snapshot.tokenSymbol);
  return `Facility after: <b>${formatAmount(snapshot.yfiBalance)}</b> YFI / <b>${formatAmount(
    snapshot.tokenBalance,
  )}</b> ${tokenSymbol}`;
}

function getLockerYfiEquivalent(
  tokenSymbol: string,
  tokenAmount: bigint,
  shares: bigint | undefined,
): bigint {
  return shares ?? toYfiAmountFromToken(tokenSymbol, tokenAmount);
}

function buildLockerYfiEquivalentLine(
  yfiEquivalent: bigint,
  yfiPriceCents: bigint | null | undefined,
): string {
  return `≈ <b>${formatAmount(yfiEquivalent)}</b> YFI${formatUsdForYfi(yfiEquivalent, yfiPriceCents)}`;
}

function buildLockerPrimaryAmountLine(
  label: "Staked" | "Cooldown" | "Withdrawn",
  symbol: string,
  tokenAmount: bigint,
  yfiEquivalent: bigint,
  yfiPriceCents: bigint | null | undefined,
): string {
  const usdSuffix = areEquivalentAtDisplayPrecision(yfiEquivalent, tokenAmount)
    ? formatUsdForYfi(yfiEquivalent, yfiPriceCents)
    : "";
  return `${label}: <b>${formatAmount(tokenAmount)}</b> ${escapeHtml(symbol)}${usdSuffix}`;
}

function buildStakedBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint | null {
  const symbol = getDisplayTokenSymbol(action.tokenSymbol);
  const normalized = action.tokenSymbol.toLowerCase();
  const lines: string[] = [];

  if (normalized === "styfi" || normalized === "styfix") {
    const yfiAmount = action.amounts.assets ?? 0n;
    const received = action.amounts.shares ?? 0n;
    lines.push(
      `Staked: <b>${formatAmount(yfiAmount)}</b> YFI${formatUsdForYfi(yfiAmount, options.yfiPriceCents)}`,
    );
    if (!areEquivalentAtDisplayPrecision(yfiAmount, received)) {
      lines.push(`Received: <b>${formatAmount(received)}</b> ${escapeHtml(symbol)}`);
    }
  } else {
    const lockerPrefix = getLockerPrefix(action.tokenSymbol);
    if (!lockerPrefix) {
      return null;
    }

    const tokenAmount = action.amounts.assets ?? 0n;
    const yfiEquivalent = getLockerYfiEquivalent(
      action.tokenSymbol,
      tokenAmount,
      action.amounts.shares,
    );
    lines.push(
      buildLockerPrimaryAmountLine(
        "Staked",
        symbol,
        tokenAmount,
        yfiEquivalent,
        options.yfiPriceCents,
      ),
    );
    if (!areEquivalentAtDisplayPrecision(yfiEquivalent, tokenAmount)) {
      lines.push(buildLockerYfiEquivalentLine(yfiEquivalent, options.yfiPriceCents));
    }
  }

  return {
    eventEmoji: "🟢",
    title: `${symbol} Staked`,
    lines,
  };
}

function buildCooldownStartedBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint | null {
  const symbol = getDisplayTokenSymbol(action.tokenSymbol);
  const normalized = action.tokenSymbol.toLowerCase();
  const lines: string[] = [];

  if (normalized === "styfi" || normalized === "styfix") {
    const yfiAmount = action.amounts.assets ?? 0n;
    lines.push(
      `Cooldown: <b>${formatAmount(yfiAmount)}</b> YFI${formatUsdForYfi(yfiAmount, options.yfiPriceCents)}`,
    );
  } else {
    const lockerPrefix = getLockerPrefix(action.tokenSymbol);
    if (!lockerPrefix) {
      return null;
    }

    const tokenAmount = action.amounts.assets ?? 0n;
    const yfiEquivalent = getLockerYfiEquivalent(
      action.tokenSymbol,
      tokenAmount,
      action.amounts.shares,
    );
    lines.push(
      buildLockerPrimaryAmountLine(
        "Cooldown",
        symbol,
        tokenAmount,
        yfiEquivalent,
        options.yfiPriceCents,
      ),
    );
    if (!areEquivalentAtDisplayPrecision(yfiEquivalent, tokenAmount)) {
      lines.push(buildLockerYfiEquivalentLine(yfiEquivalent, options.yfiPriceCents));
    }
  }

  return {
    eventEmoji: "🧊",
    title: `${symbol} Cooldown Started`,
    lines,
  };
}

function buildCooldownWithdrawnBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint | null {
  const symbol = getDisplayTokenSymbol(action.tokenSymbol);
  const normalized = action.tokenSymbol.toLowerCase();
  const lines: string[] = [];

  if (normalized === "styfi" || normalized === "styfix") {
    const yfiAmount = action.amounts.assets ?? 0n;
    const burned = action.amounts.shares ?? 0n;
    lines.push(
      `Withdrawn: <b>${formatAmount(yfiAmount)}</b> YFI${formatUsdForYfi(yfiAmount, options.yfiPriceCents)}`,
    );
    if (!areEquivalentAtDisplayPrecision(yfiAmount, burned)) {
      lines.push(`Burned: <b>${formatAmount(burned)}</b> ${escapeHtml(symbol)}`);
    }
  } else {
    const lockerPrefix = getLockerPrefix(action.tokenSymbol);
    if (!lockerPrefix) {
      return null;
    }

    const tokenAmount = action.amounts.assets ?? 0n;
    const yfiEquivalent = getLockerYfiEquivalent(
      action.tokenSymbol,
      tokenAmount,
      action.amounts.shares,
    );
    lines.push(
      buildLockerPrimaryAmountLine(
        "Withdrawn",
        symbol,
        tokenAmount,
        yfiEquivalent,
        options.yfiPriceCents,
      ),
    );
    if (!areEquivalentAtDisplayPrecision(yfiEquivalent, tokenAmount)) {
      lines.push(buildLockerYfiEquivalentLine(yfiEquivalent, options.yfiPriceCents));
    }
  }

  return {
    eventEmoji: "🏁",
    title: `${symbol} Cooldown Withdrawn`,
    lines,
  };
}

function buildRedeemBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint | null {
  const lockerPrefix = getLockerPrefix(action.tokenSymbol);
  if (!lockerPrefix) {
    return null;
  }

  const symbol = getDisplayTokenSymbol(action.tokenSymbol);
  const tokenAmount = action.amounts.amount ?? 0n;
  const feeAmount = action.amounts.fee ?? 0n;
  const grossYfi = toYfiAmountFromToken(action.tokenSymbol, tokenAmount);
  const netYfi = grossYfi > feeAmount ? grossYfi - feeAmount : 0n;
  const lines: string[] = [
    `Sold: <b>${formatAmount(tokenAmount)}</b> ${escapeHtml(symbol)}`,
    `Received: <b>${formatAmount(netYfi)}</b> YFI${formatUsdForYfi(netYfi, options.yfiPriceCents)}`,
  ];

  if (feeAmount > 0n) {
    lines.push(
      `Fee: <b>${formatAmount(feeAmount)}</b> YFI (${formatPercent(feeAmount, grossYfi)}%)${formatUsdForYfi(
        feeAmount,
        options.yfiPriceCents,
      )}`,
    );
  }

  if (action.tokenSymbol.toLowerCase() === "coveyfi") {
    const facilityLine = buildFacilityLine(options.redemptionFacilitySnapshot);
    if (facilityLine) {
      lines.push(facilityLine);
    }
  }

  return {
    eventEmoji: "💸",
    title: `Redeemed ${symbol} for YFI`,
    lines,
  };
}

function buildExchangeBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint | null {
  const lockerPrefix = getLockerPrefix(action.tokenSymbol);
  if (!lockerPrefix) {
    return null;
  }

  const symbol = getDisplayTokenSymbol(action.tokenSymbol);
  const yfiSpent = action.amounts.amount ?? 0n;
  const tokenReceived = toTokenAmountFromYfi(action.tokenSymbol, yfiSpent);
  const lines: string[] = [
    `Spent: <b>${formatAmount(yfiSpent)}</b> YFI${formatUsdForYfi(yfiSpent, options.yfiPriceCents)}`,
    `Received: <b>${formatAmount(tokenReceived)}</b> ${escapeHtml(symbol)}`,
  ];

  if (action.tokenSymbol.toLowerCase() === "coveyfi") {
    const facilityLine = buildFacilityLine(options.redemptionFacilitySnapshot);
    if (facilityLine) {
      lines.push(facilityLine);
    }
  }

  return {
    eventEmoji: "🛒",
    title: `Bought ${symbol} with YFI`,
    lines,
  };
}

function buildMigrateBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  const unlockEpoch = action.amounts.unlockEpoch ?? 0n;
  const unlockTimestamp = GENESIS_SECONDS + unlockEpoch * EPOCH_LENGTH_SECONDS;

  return {
    eventEmoji: "🚚",
    title: "veYFI Migrated",
    lines: [
      `Amount: <b>${formatAmount(action.amounts.amount ?? 0n)}</b> YFI${formatUsdForYfi(
        action.amounts.amount ?? 0n,
        options.yfiPriceCents,
      )}`,
      `Unlock: <b>${formatUtcDate(unlockTimestamp)}</b> (epoch <b>${unlockEpoch.toString()}</b>)`,
    ],
  };
}

function buildLegacyLockCreatedBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  return {
    eventEmoji: "🔐",
    title: "Legacy veYFI Lock Created",
    lines: [
      `Locked: <b>${formatAmount(action.amounts.amount ?? 0n)}</b> YFI${formatUsdForYfi(
        action.amounts.amount ?? 0n,
        options.yfiPriceCents,
      )}`,
      `Unlock: <b>${formatUtcDate(action.amounts.locktime ?? 0n)}</b>`,
    ],
  };
}

function buildLegacyLockUpdatedBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  const currentAmount = action.amounts.amount ?? 0n;
  const currentLocktime = action.amounts.locktime ?? 0n;
  const previousAmount = action.amounts.previousAmount;
  const previousLocktime = action.amounts.previousLocktime;
  const lines = [
    `Locked: <b>${formatAmount(currentAmount)}</b> YFI${formatUsdForYfi(
      currentAmount,
      options.yfiPriceCents,
    )}`,
    `Unlock: <b>${formatUtcDate(currentLocktime)}</b>`,
  ];

  if (previousAmount !== undefined) {
    const deltaAmount = currentAmount - previousAmount;
    lines.push(
      `Δ Locked: <b>${formatSignedAmount(deltaAmount)}</b> YFI${formatUsdForYfi(
        deltaAmount,
        options.yfiPriceCents,
      )}`,
    );
  }
  if (previousLocktime !== undefined && previousLocktime !== currentLocktime) {
    lines.push(`Unlock was: <b>${formatUtcDate(previousLocktime)}</b>`);
  }

  return {
    eventEmoji: "🗓️",
    title: "Legacy veYFI Lock Updated",
    lines,
  };
}

function buildLegacyWithdrawBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  const withdrawn = action.amounts.amount ?? 0n;
  const penalty = action.amounts.penalty ?? 0n;

  if (penalty > 0n) {
    return {
      eventEmoji: "🏃",
      title: "Legacy veYFI Early Exit",
      lines: [
        `Withdrawn: <b>${formatAmount(withdrawn)}</b> YFI${formatUsdForYfi(
          withdrawn,
          options.yfiPriceCents,
        )}`,
        `Penalty: <b>${formatAmount(penalty)}</b> YFI (${formatPercent(
          penalty,
          withdrawn + penalty,
        )}%)${formatUsdForYfi(penalty, options.yfiPriceCents)}`,
      ],
    };
  }

  return {
    eventEmoji: "🏦",
    title: "Legacy veYFI Withdrawn",
    lines: [
      `Withdrawn: <b>${formatAmount(withdrawn)}</b> YFI${formatUsdForYfi(
        withdrawn,
        options.yfiPriceCents,
      )}`,
    ],
  };
}

function buildMessageBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint | null {
  if (action.kind === "staked") {
    return buildStakedBlueprint(action, options);
  }

  if (action.kind === "initiated_cooldown") {
    return buildCooldownStartedBlueprint(action, options);
  }

  if (action.kind === "withdrew_from_cooldown") {
    return buildCooldownWithdrawnBlueprint(action, options);
  }

  if (action.kind === "redeem") {
    return buildRedeemBlueprint(action, options);
  }

  if (action.kind === "exchange") {
    return buildExchangeBlueprint(action, options);
  }

  if (action.kind === "migrate") {
    return buildMigrateBlueprint(action, options);
  }

  if (action.kind === "lock") {
    return buildLegacyLockCreatedBlueprint(action, options);
  }

  if (action.kind === "extension" || action.kind === "update") {
    return buildLegacyLockUpdatedBlueprint(action, options);
  }

  if (action.kind === "legacy_withdraw") {
    return buildLegacyWithdrawBlueprint(action, options);
  }

  return null;
}

export function renderTelegramMessage(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions = {},
): string | null {
  // Penalty events are emitted alongside legacy withdraw events.
  // We avoid duplicate notifications by skipping this event family.
  if (action.kind === "penalty") {
    return null;
  }

  const blueprint = buildMessageBlueprint(action, options);
  if (blueprint === null) {
    return null;
  }

  const impact = classifyActionImpact(action);
  const lines: string[] = [];
  if (impact.tier.key === "whale") {
    lines.push("🚨 <b>WHALE MOVE</b>");
  }

  lines.push(
    `<b>${impact.tier.emoji} ${blueprint.eventEmoji} ${escapeHtml(blueprint.title)}</b>`,
  );
  lines.push(buildImpactLine(action));
  lines.push(...blueprint.lines);
  const impactBasisLine = buildImpactBasisLine(action, options);
  if (impactBasisLine) {
    lines.push(impactBasisLine);
  }
  lines.push(...buildActorLines(action, options));
  lines.push(`Tx: ${buildTxLink(action.txHash)}`);
  lines.push(buildFooterLine(action, options.blockTimestampSeconds ?? null));

  return lines.join("\n");
}

export function shouldPersistSkippedAction(action: NormalizedAction): boolean {
  return action.kind === "penalty";
}

export function formatActionLine(action: NormalizedAction): string {
  const parts: string[] = [];
  const impact = classifyActionImpact(action);

  if (action.amounts.assets !== undefined) {
    parts.push(`assets=${formatAmount(action.amounts.assets)}`);
  }
  if (action.amounts.shares !== undefined) {
    parts.push(`shares=${formatAmount(action.amounts.shares)}`);
  }
  if (action.amounts.amount !== undefined) {
    parts.push(`amount=${formatAmount(action.amounts.amount)}`);
  }
  if (action.amounts.fee !== undefined) {
    parts.push(`fee=${formatAmount(action.amounts.fee)}`);
  }
  if (action.amounts.penalty !== undefined) {
    parts.push(`penalty=${formatAmount(action.amounts.penalty)}`);
  }
  if (action.amounts.unlockEpoch !== undefined) {
    parts.push(`unlockEpoch=${action.amounts.unlockEpoch.toString()}`);
  }
  if (action.amounts.locktime !== undefined) {
    parts.push(`locktime=${action.amounts.locktime.toString()}`);
  }
  parts.push(`impactYfi=${formatAmount(impact.impactYfi)}`);
  parts.push(`impactTier=${impact.tier.label.toLowerCase()}`);

  const token = isLockerToken(action.tokenSymbol)
    ? getDisplayTokenSymbol(action.tokenSymbol)
    : action.tokenSymbol;

  return [
    "[dry-run]",
    `kind=${action.kind}`,
    `token=${token}`,
    `user=${action.user}`,
    ...parts,
    `tx=${action.txHash}`,
    `block=${action.blockNumber}`,
    `logIndex=${action.logIndex}`,
  ].join(" ");
}
