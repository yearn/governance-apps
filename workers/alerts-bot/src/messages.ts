import deployment from "../../../lib/deployment.json";
import { LIQUID_LOCKERS } from "./contracts";
import {
  formatAmount,
  formatPercent,
  formatUtcDate,
  shortAddress,
} from "./format";
import type { NormalizedAction, YethWithdrawalType } from "./types";

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
  impactPercentHundredths: bigint | null;
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
  yethYieldVaultAssetsEth?: bigint | null;
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

function isZeroAddress(value: string): boolean {
  return normalizeAddress(value) === "0x0000000000000000000000000000000000000000";
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

function clampRatioToOne(value: bigint): bigint {
  if (value <= 0n) {
    return 0n;
  }
  if (value >= ONE_YFI) {
    return ONE_YFI;
  }
  return value;
}

function getRedeemGrossYfi(action: NormalizedAction): bigint {
  return toYfiAmountFromToken(action.tokenSymbol, action.amounts.amount ?? 0n);
}

function getRedeemFeeRate(action: NormalizedAction): bigint {
  return clampRatioToOne(action.amounts.fee ?? 0n);
}

function getRedeemFeeAmountYfi(action: NormalizedAction): bigint {
  const grossYfi = getRedeemGrossYfi(action);
  if (grossYfi <= 0n) {
    return 0n;
  }

  const feeRate = getRedeemFeeRate(action);
  if (feeRate <= 0n) {
    return 0n;
  }

  // Redemption events expose fee as a 1e18-scaled rate; convert to YFI amount.
  return (grossYfi * feeRate) / ONE_YFI;
}

function formatYfiAmount(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  if (absolute === 0n) {
    return "0.00";
  }

  const hundredth = ONE_YFI / 100n;
  if (absolute >= hundredth) {
    return formatAmount(value);
  }

  const precisionScale = 10_000n;
  const rounded = (absolute * precisionScale + ONE_YFI / 2n) / ONE_YFI;
  const sign = value < 0n ? "-" : "";
  if (rounded <= 0n) {
    return `${sign}<0.0001`;
  }

  const whole = rounded / precisionScale;
  const fraction = (rounded % precisionScale).toString().padStart(4, "0");
  return `${sign}${whole.toString()}.${fraction}`;
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

function isYethSnapshotAction(action: NormalizedAction): boolean {
  return (
    action.kind === "yeth_claimed_stayed" ||
    action.kind === "yeth_claimed_exited" ||
    action.kind === "yeth_recovery_vault_withdraw"
  );
}

function isYethProgressAction(action: NormalizedAction): boolean {
  return (
    action.kind === "yeth_debt_paid_down" ||
    action.kind === "yeth_recovery_progress" ||
    action.kind === "yeth_recovery_setback" ||
    action.kind === "yeth_yield_capacity_up" ||
    action.kind === "yeth_yield_capacity_down"
  );
}

function toPercentHundredths(numerator: bigint, denominator: bigint): bigint {
  if (numerator <= 0n || denominator <= 0n) {
    return 0n;
  }

  return (numerator * 10_000n + denominator / 2n) / denominator;
}

function isBelowPercentHundredthsThreshold(
  moved: bigint,
  total: bigint,
  thresholdHundredths: bigint,
): boolean {
  if (moved <= 0n || total <= 0n) {
    return true;
  }

  return moved * 10_000n < thresholdHundredths * total;
}

function classifyLegacyImpactTier(
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

function classifyYethImpactTier(basis: {
  moved: bigint;
  total: bigint;
}): ImpactTier {
  if (basis.moved <= 0n || basis.total <= 0n) {
    return IMPACT_TIERS.info;
  }

  if (isBelowPercentHundredthsThreshold(basis.moved, basis.total, 10n)) {
    return IMPACT_TIERS.shrimp;
  }

  if (isBelowPercentHundredthsThreshold(basis.moved, basis.total, 50n)) {
    return IMPACT_TIERS.fish;
  }

  if (isBelowPercentHundredthsThreshold(basis.moved, basis.total, 200n)) {
    return IMPACT_TIERS.dolphin;
  }

  if (isBelowPercentHundredthsThreshold(basis.moved, basis.total, 1_000n)) {
    return IMPACT_TIERS.shark;
  }

  return IMPACT_TIERS.whale;
}

function getLegacyImpactYfi(action: NormalizedAction): bigint {
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

function isLegacyInfoImpact(action: NormalizedAction): boolean {
  if (action.kind !== "extension" && action.kind !== "update") {
    return false;
  }

  if (action.amounts.previousAmount === undefined) {
    return false;
  }

  const current = action.amounts.amount ?? 0n;
  return current === action.amounts.previousAmount;
}

function getYethImpactBasis(action: NormalizedAction): {
  moved: bigint;
  total: bigint;
} {
  const moved =
    action.kind === "yeth_recovery_vault_withdraw"
      ? (action.amounts.yethSnapshotMoved ?? 0n)
      : (action.amounts.yethSnapshotAmount ?? 0n);

  return {
    moved,
    total: action.amounts.yethTotalSnapshotDebtEth ?? 0n,
  };
}

export function classifyActionImpact(action: NormalizedAction): ImpactClassification {
  if (isYethSnapshotAction(action)) {
    const basis = getYethImpactBasis(action);
    const impactPercentHundredths = toPercentHundredths(basis.moved, basis.total);
    return {
      impactYfi: 0n,
      impactPercentHundredths,
      tier: classifyYethImpactTier(basis),
    };
  }

  if (isYethProgressAction(action)) {
    return {
      impactYfi: 0n,
      impactPercentHundredths: null,
      tier: IMPACT_TIERS.info,
    };
  }

  const impactYfi = getLegacyImpactYfi(action);
  return {
    impactYfi,
    impactPercentHundredths: null,
    tier: classifyLegacyImpactTier(impactYfi, isLegacyInfoImpact(action)),
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
  if (isYethSnapshotAction(action)) {
    const basis = getYethImpactBasis(action);
    return `Impact basis: <b>${formatPercent(basis.moved, basis.total)}%</b> of total snapshot debt moved`;
  }

  if (action.kind === "redeem") {
    const grossYfi = getRedeemGrossYfi(action);
    if (grossYfi <= 0n) {
      return "";
    }

    const feeRate = getRedeemFeeRate(action);
    if (feeRate <= 0n) {
      return "";
    }
    const feeAmount = getRedeemFeeAmountYfi(action);
    const netYfi = grossYfi > feeAmount ? grossYfi - feeAmount : 0n;

    return `Impact basis: <b>${formatYfiAmount(grossYfi)}</b> YFI${formatUsdForYfi(
      grossYfi,
      options.yfiPriceCents,
    )} gross (net <b>${formatYfiAmount(netYfi)}</b> YFI)`;
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

  const isRenderableActor = (value: string | undefined): value is string => {
    if (typeof value !== "string") {
      return false;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.toLowerCase() === "unknown") {
      return false;
    }

    return !trimmed.startsWith("0x") || !isZeroAddress(trimmed);
  };

  const accountCandidates =
    action.kind === "withdrew_from_cooldown"
      ? [action.owner, action.receiver, action.user]
      : [action.user, action.owner, action.receiver];
  const account =
    accountCandidates.find((candidate) => isRenderableActor(candidate))?.trim() ?? null;
  const owner = isRenderableActor(action.owner)
    ? action.owner.trim()
    : account ?? undefined;
  const receiver = isRenderableActor(action.receiver)
    ? action.receiver.trim()
    : account ?? undefined;
  const caller = isRenderableActor(action.caller) ? action.caller.trim() : undefined;

  const addLine = (label: string, value: string | undefined): void => {
    if (!value) {
      return;
    }

    if (value.startsWith("0x") && isZeroAddress(value)) {
      return;
    }

    const duplicate = seen.some((existing) => areSameAddress(existing, value));
    if (duplicate) {
      return;
    }

    seen.push(value);
    lines.push(`${label}: ${buildAddressLink(value, options.ensNamesByAddress)}`);
  };

  if (account && owner && receiver && areSameAddress(account, owner) && areSameAddress(account, receiver)) {
    addLine("Account", account);
  } else {
    addLine("Account", account ?? undefined);
    if (owner && (!account || !areSameAddress(owner, account))) {
      addLine("Owner", owner);
    }
    if (
      receiver &&
      (!account || !areSameAddress(receiver, account)) &&
      (!owner || !areSameAddress(receiver, owner))
    ) {
      addLine("Receiver", receiver);
    }
  }

  if (caller) {
    addLine("Caller", caller);
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
  const grossYfi = getRedeemGrossYfi(action);
  const feeRate = getRedeemFeeRate(action);
  const feeAmount = getRedeemFeeAmountYfi(action);
  const netYfi = grossYfi > feeAmount ? grossYfi - feeAmount : 0n;
  const lines: string[] = [
    `Sold: <b>${formatAmount(tokenAmount)}</b> ${escapeHtml(symbol)}`,
    `Received: <b>${formatYfiAmount(netYfi)}</b> YFI${formatUsdForYfi(
      netYfi,
      options.yfiPriceCents,
    )}`,
  ];

  if (feeRate > 0n) {
    lines.push(
      `Fee: <b>${formatYfiAmount(feeAmount)}</b> YFI (${formatPercent(
        feeRate,
        ONE_YFI,
      )}%)${formatUsdForYfi(
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

function formatPercentHundredths(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole.toString()}.${fraction}`;
}

function formatSignedPercentPointHundredths(value: bigint): string {
  const sign = value > 0n ? "+" : value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${formatPercentHundredths(absolute)}`;
}

function formatSignedEthAmount(value: bigint): string {
  const sign = value > 0n ? "+" : value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${formatAmount(absolute)}`;
}

function buildYethMixPercents(action: NormalizedAction): {
  exited: bigint;
  stayed: bigint;
  unclaimed: bigint;
} {
  const total = action.amounts.yethTotalSnapshotDebtEth ?? 0n;
  if (total <= 0n) {
    return {
      exited: 0n,
      stayed: 0n,
      unclaimed: 0n,
    };
  }

  let exited = toPercentHundredths(action.amounts.yethSnapshotExitedEth ?? 0n, total);
  let stayed = toPercentHundredths(action.amounts.yethSnapshotStayedEth ?? 0n, total);
  let unclaimed = 10_000n - exited - stayed;

  if (unclaimed < 0n) {
    const overflow = -unclaimed;
    if (stayed >= exited) {
      stayed = stayed > overflow ? stayed - overflow : 0n;
    } else {
      exited = exited > overflow ? exited - overflow : 0n;
    }
    unclaimed = 0n;
  }

  return {
    exited,
    stayed,
    unclaimed,
  };
}

function getYethYieldVaultAssetsEth(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): bigint | null {
  if (options.yethYieldVaultAssetsEth !== undefined) {
    return options.yethYieldVaultAssetsEth;
  }
  return action.amounts.yethYieldVaultAssetsEth ?? null;
}

function buildYethCommonMetricLines(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): string[] {
  const mix = buildYethMixPercents(action);
  const outstanding = action.amounts.yethOutstandingDebtEth ?? 0n;
  const yieldVaultAssets = getYethYieldVaultAssetsEth(action, options);
  const yieldVaultLine =
    yieldVaultAssets === null
      ? "Yield Vault assets: <b>n/a</b>"
      : `Yield Vault assets: <b>${formatAmount(yieldVaultAssets)}</b> ETH${
          outstanding > 0n
            ? ` (coverage <b>${formatPercent(yieldVaultAssets, outstanding)}%</b>)`
            : ""
        }`;

  return [
    `Snapshot mix: <b>Exited ${formatPercentHundredths(mix.exited)}%</b> • <b>Stayed ${formatPercentHundredths(
      mix.stayed,
    )}%</b> • <b>Unclaimed ${formatPercentHundredths(mix.unclaimed)}%</b>`,
    `Outstanding debt: <b>${formatAmount(outstanding)}</b> ETH`,
    yieldVaultLine,
  ];
}

function buildYethClaimedStayedBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  const snapshotAmount = action.amounts.yethSnapshotAmount ?? 0n;
  const totalSnapshotDebt = action.amounts.yethTotalSnapshotDebtEth ?? 0n;
  const impactPercent = formatPercent(snapshotAmount, totalSnapshotDebt);

  return {
    eventEmoji: "🟢",
    title: "yETH Claimed & Stayed",
    lines: [
      `Snapshot amount: <b>${formatAmount(snapshotAmount)}</b> ETH (account weight <b>${impactPercent}%</b>)`,
      `Δ Mix: <b>Stayed +${impactPercent}%</b> • <b>Unclaimed -${impactPercent}%</b>`,
      ...buildYethCommonMetricLines(action, options),
    ],
  };
}

function buildYethClaimedExitedBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  const snapshotAmount = action.amounts.yethSnapshotAmount ?? 0n;
  const totalSnapshotDebt = action.amounts.yethTotalSnapshotDebtEth ?? 0n;
  const impactPercent = formatPercent(snapshotAmount, totalSnapshotDebt);

  return {
    eventEmoji: "🏁",
    title: "yETH Claimed & Exited",
    lines: [
      `Snapshot amount: <b>${formatAmount(snapshotAmount)}</b> ETH (account weight <b>${impactPercent}%</b>)`,
      `Δ Mix: <b>Exited +${impactPercent}%</b> • <b>Unclaimed -${impactPercent}%</b>`,
      ...buildYethCommonMetricLines(action, options),
    ],
  };
}

function toYethWithdrawalTypeLabel(
  value: YethWithdrawalType | undefined,
): "Full" | "Partial" {
  if (value === "full") {
    return "Full";
  }
  return "Partial";
}

function buildYethRecoveryVaultWithdrawBlueprint(
  action: NormalizedAction,
  options: RenderTelegramMessageOptions,
): MessageBlueprint {
  const snapshotMoved = action.amounts.yethSnapshotMoved ?? 0n;
  const totalSnapshotDebt = action.amounts.yethTotalSnapshotDebtEth ?? 0n;
  const impactPercent = formatPercent(snapshotMoved, totalSnapshotDebt);
  const sharesBurned = action.amounts.yethSharesBurned ?? 0n;
  const ownerSharesBefore = action.amounts.yethOwnerSharesBefore ?? sharesBurned;
  const ownerSharesAfter = action.amounts.yethOwnerSharesAfter ?? 0n;
  const withdrawalType =
    action.yethWithdrawalType ??
    (ownerSharesAfter <= 0n ? "full" : "partial");

  return {
    eventEmoji: "💸",
    title: "yETH Recovery Vault Withdraw",
    lines: [
      `Withdrawal type: <b>${toYethWithdrawalTypeLabel(withdrawalType)}</b>`,
      `Shares burned: <b>${formatAmount(sharesBurned)}</b> yswETH of <b>${formatAmount(
        ownerSharesBefore,
      )}</b> yswETH (<b>${formatPercent(sharesBurned, ownerSharesBefore)}%</b>)`,
      `Shares remaining: <b>${formatAmount(ownerSharesAfter)}</b> yswETH`,
      `Snapshot moved to exited: <b>${formatAmount(snapshotMoved)}</b> ETH`,
      `Δ Mix: <b>Exited +${impactPercent}%</b> • <b>Stayed -${impactPercent}%</b>`,
      ...buildYethCommonMetricLines(action, options),
    ],
  };
}

function buildYethDebtPaidDownBlueprint(action: NormalizedAction): MessageBlueprint {
  const previousOutstanding = action.amounts.yethPreviousOutstandingDebtEth ?? 0n;
  const currentOutstanding =
    action.amounts.yethCurrentOutstandingDebtEth ?? action.amounts.yethOutstandingDebtEth ?? 0n;
  const debtPaidDown =
    previousOutstanding > currentOutstanding ? previousOutstanding - currentOutstanding : 0n;
  const repaidBefore = action.amounts.yethPreviousRepaidPercentHundredths ?? 0n;
  const repaidAfter = action.amounts.yethCurrentRepaidPercentHundredths ?? repaidBefore;

  return {
    eventEmoji: "🟢",
    title: "yETH Debt Paid Down",
    lines: [
      `Debt paid down: <b>${formatAmount(debtPaidDown)}</b> ETH (trigger <b>0.50</b> ETH)`,
      `Outstanding debt: <b>${formatAmount(previousOutstanding)}</b> → <b>${formatAmount(currentOutstanding)}</b> ETH`,
      `Repaid since snapshot: <b>${formatPercentHundredths(repaidBefore)}%</b> → <b>${formatPercentHundredths(
        repaidAfter,
      )}%</b> (<b>${formatSignedPercentPointHundredths(repaidAfter - repaidBefore)} pts</b>)`,
    ],
  };
}

function buildYethRecoveryProgressBlueprint(action: NormalizedAction): MessageBlueprint {
  const shortfallBefore = action.amounts.yethPreviousRecoveryShortfallEth ?? 0n;
  const shortfallAfter = action.amounts.yethCurrentRecoveryShortfallEth ?? 0n;
  const shortfallDelta = shortfallAfter - shortfallBefore;
  const shortfallDeltaAbsolute = shortfallDelta < 0n ? -shortfallDelta : shortfallDelta;
  const coverageBefore = action.amounts.yethPreviousRecoveryCoverageHundredths ?? 0n;
  const coverageAfter = action.amounts.yethCurrentRecoveryCoverageHundredths ?? 0n;
  const stayedDebt = action.amounts.yethSnapshotStayedEth ?? 0n;
  const recoveryAssets = action.amounts.yethCurrentRecoveryVaultAssetsEth ?? 0n;
  const recoveryNetFlow = action.amounts.yethRecoveryNetFlowEth ?? 0n;
  const recoveryOrganicDelta = action.amounts.yethRecoveryOrganicDeltaEth ?? 0n;
  const isProgress = action.kind === "yeth_recovery_progress";
  const isInitialized =
    shortfallBefore === 0n &&
    coverageBefore === 0n &&
    (shortfallAfter > 0n || coverageAfter > 0n || stayedDebt > 0n || recoveryAssets > 0n);
  const title = isInitialized
    ? "yETH Recovery Initialized"
    : isProgress
      ? "yETH Recovery Progress"
      : "yETH Recovery Setback";

  return {
    eventEmoji: isInitialized ? "ℹ️" : isProgress ? "🟢" : "🟠",
    title,
    lines: [
      isInitialized
        ? `Recovery baseline: shortfall <b>${formatAmount(shortfallBefore)}</b> → <b>${formatAmount(shortfallAfter)}</b> ETH`
        : isProgress
          ? `Shortfall reduced: <b>${formatAmount(shortfallBefore)}</b> → <b>${formatAmount(shortfallAfter)}</b> ETH (<b>-${formatAmount(shortfallDeltaAbsolute)}</b> ETH)`
          : `Shortfall widened: <b>${formatAmount(shortfallBefore)}</b> → <b>${formatAmount(shortfallAfter)}</b> ETH (<b>+${formatAmount(shortfallDeltaAbsolute)}</b> ETH)`,
      `Recovery coverage: <b>${formatPercentHundredths(coverageBefore)}%</b> → <b>${formatPercentHundredths(
        coverageAfter,
      )}%</b> (<b>${formatSignedPercentPointHundredths(
        coverageAfter - coverageBefore,
      )} pts</b>)`,
      `Stayed debt: <b>${formatAmount(stayedDebt)}</b> ETH • Recovery Vault assets: <b>${formatAmount(recoveryAssets)}</b> ETH`,
      `Drivers: Net user flow <b>${formatSignedEthAmount(recoveryNetFlow)}</b> ETH • Yield/fees/donations <b>${formatSignedEthAmount(recoveryOrganicDelta)}</b> ETH`,
    ],
  };
}

function buildYethYieldCapacityBlueprint(action: NormalizedAction): MessageBlueprint {
  const previousAssets = action.amounts.yethPreviousYieldVaultAssetsEth ?? 0n;
  const currentAssets =
    action.amounts.yethCurrentYieldVaultAssetsEth ?? action.amounts.yethYieldVaultAssetsEth ?? 0n;
  const capacityDelta = currentAssets - previousAssets;
  const coverageBefore = action.amounts.yethPreviousYieldCoverageHundredths ?? 0n;
  const coverageAfter = action.amounts.yethCurrentYieldCoverageHundredths ?? 0n;
  const yieldNetFlow = action.amounts.yethYieldNetFlowEth ?? 0n;
  const yieldOrganicDelta = action.amounts.yethYieldOrganicDeltaEth ?? 0n;
  const outstanding =
    action.amounts.yethCurrentOutstandingDebtEth ?? action.amounts.yethOutstandingDebtEth ?? 0n;
  const isUp = action.kind === "yeth_yield_capacity_up";
  const isInitialized =
    previousAssets === 0n &&
    coverageBefore === 0n &&
    (currentAssets > 0n || coverageAfter > 0n);
  const title = isInitialized
    ? "yETH Yield Capacity Initialized"
    : isUp
      ? "yETH Yield Capacity Up"
      : "yETH Yield Capacity Down";

  return {
    eventEmoji: isInitialized ? "ℹ️" : isUp ? "🟢" : "🔻",
    title,
    lines: [
      isInitialized
        ? `Yield Vault baseline: assets <b>${formatAmount(previousAssets)}</b> → <b>${formatAmount(currentAssets)}</b> ETH`
        : `Yield Vault assets: <b>${formatAmount(previousAssets)}</b> → <b>${formatAmount(currentAssets)}</b> ETH (<b>${formatSignedEthAmount(capacityDelta)}</b> ETH)`,
      `Capacity vs outstanding debt: <b>${formatPercentHundredths(coverageBefore)}%</b> → <b>${formatPercentHundredths(
        coverageAfter,
      )}%</b> (<b>${formatSignedPercentPointHundredths(
        coverageAfter - coverageBefore,
      )} pts</b>)`,
      `Net claim flow: <b>${formatSignedEthAmount(yieldNetFlow)}</b> ETH • Organic delta (yield/loss): <b>${formatSignedEthAmount(yieldOrganicDelta)}</b> ETH`,
      `Outstanding debt: <b>${formatAmount(outstanding)}</b> ETH`,
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

  if (action.kind === "yeth_claimed_stayed") {
    return buildYethClaimedStayedBlueprint(action, options);
  }

  if (action.kind === "yeth_claimed_exited") {
    return buildYethClaimedExitedBlueprint(action, options);
  }

  if (action.kind === "yeth_recovery_vault_withdraw") {
    return buildYethRecoveryVaultWithdrawBlueprint(action, options);
  }

  if (action.kind === "yeth_debt_paid_down") {
    return buildYethDebtPaidDownBlueprint(action);
  }

  if (action.kind === "yeth_recovery_progress" || action.kind === "yeth_recovery_setback") {
    return buildYethRecoveryProgressBlueprint(action);
  }

  if (action.kind === "yeth_yield_capacity_up" || action.kind === "yeth_yield_capacity_down") {
    return buildYethYieldCapacityBlueprint(action);
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
  const includeImpact = !isYethProgressAction(action);
  const includeActors = !isYethProgressAction(action);
  const includeTx = !isYethProgressAction(action);
  const titlePrefix = includeImpact
    ? `${impact.tier.emoji} ${blueprint.eventEmoji}`
    : blueprint.eventEmoji;
  const lines: string[] = [];
  if (includeImpact && impact.tier.key === "whale") {
    lines.push("🚨 <b>WHALE MOVE</b>");
  }

  lines.push(`<b>${titlePrefix} ${escapeHtml(blueprint.title)}</b>`);
  if (includeImpact) {
    lines.push(buildImpactLine(action));
    const impactBasisLine = buildImpactBasisLine(action, options);
    if (impactBasisLine) {
      lines.push(impactBasisLine);
    }
  }
  lines.push(...blueprint.lines);
  if (includeActors) {
    lines.push(...buildActorLines(action, options));
  }
  if (includeTx) {
    lines.push(`Tx: ${buildTxLink(action.txHash)}`);
  }
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
    if (action.kind === "redeem") {
      parts.push(`feeRate=${formatPercent(getRedeemFeeRate(action), ONE_YFI)}%`);
      parts.push(`fee=${formatAmount(getRedeemFeeAmountYfi(action))}`);
    } else {
      parts.push(`fee=${formatAmount(action.amounts.fee)}`);
    }
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
  if (action.amounts.yethSnapshotAmount !== undefined) {
    parts.push(`yethSnapshotAmount=${formatAmount(action.amounts.yethSnapshotAmount)}`);
  }
  if (action.amounts.yethSnapshotMoved !== undefined) {
    parts.push(`yethSnapshotMoved=${formatAmount(action.amounts.yethSnapshotMoved)}`);
  }
  if (action.amounts.yethTotalSnapshotDebtEth !== undefined) {
    parts.push(
      `yethTotalSnapshotDebt=${formatAmount(action.amounts.yethTotalSnapshotDebtEth)}`,
    );
  }
  if (action.amounts.yethSnapshotExitedEth !== undefined) {
    parts.push(`yethExited=${formatAmount(action.amounts.yethSnapshotExitedEth)}`);
  }
  if (action.amounts.yethSnapshotStayedEth !== undefined) {
    parts.push(`yethStayed=${formatAmount(action.amounts.yethSnapshotStayedEth)}`);
  }
  if (action.amounts.yethSnapshotUnclaimedEth !== undefined) {
    parts.push(`yethUnclaimed=${formatAmount(action.amounts.yethSnapshotUnclaimedEth)}`);
  }
  if (action.amounts.yethOutstandingDebtEth !== undefined) {
    parts.push(`yethOutstanding=${formatAmount(action.amounts.yethOutstandingDebtEth)}`);
  }
  if (action.amounts.yethSharesBurned !== undefined) {
    parts.push(`yethSharesBurned=${formatAmount(action.amounts.yethSharesBurned)}`);
  }
  if (action.amounts.yethOwnerSharesBefore !== undefined) {
    parts.push(
      `yethOwnerSharesBefore=${formatAmount(action.amounts.yethOwnerSharesBefore)}`,
    );
  }
  if (action.amounts.yethOwnerSharesAfter !== undefined) {
    parts.push(`yethOwnerSharesAfter=${formatAmount(action.amounts.yethOwnerSharesAfter)}`);
  }
  if (impact.impactPercentHundredths !== null) {
    parts.push(`impactPct=${formatPercentHundredths(impact.impactPercentHundredths)}%`);
  } else {
    parts.push(`impactYfi=${formatAmount(impact.impactYfi)}`);
  }
  parts.push(`impactTier=${impact.tier.label.toLowerCase()}`);
  if (action.yethWithdrawalType) {
    parts.push(`withdrawalType=${action.yethWithdrawalType}`);
  }

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
