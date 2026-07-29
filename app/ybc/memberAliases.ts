import { isAddress } from "viem";
import { hasUnsafeYbcDisplayCharacters } from "@/lib/clients/ybc/displaySafety";

export const YBC_MEMBER_ALIASES_STORAGE_KEY =
  "yearn.ybc.member-aliases.v1";
export const YBC_MEMBER_ALIASES_VERSION = 1;
export const YBC_MEMBER_ALIAS_MAX_LENGTH = 40;
export const YBC_MEMBER_ALIASES_MAX_ENTRIES = 128;
export const YBC_MEMBER_ALIASES_MAX_STORAGE_LENGTH = 32_768;

export type YbcMemberAliases = Record<string, string>;

type YbcMemberAliasesEnvelope = {
  version: typeof YBC_MEMBER_ALIASES_VERSION;
  aliases: YbcMemberAliases;
};

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const ADJECTIVES = [
  "Brisk",
  "Clever",
  "Curious",
  "Daring",
  "Gentle",
  "Keen",
  "Lively",
  "Nimble",
  "Patient",
  "Sly",
  "Steady",
  "Wise",
] as const;

const ANIMALS = [
  "Badger",
  "Falcon",
  "Fox",
  "Heron",
  "Lynx",
  "Otter",
  "Owl",
  "Panda",
  "Raven",
  "Stoat",
  "Turtle",
  "Wombat",
] as const;

export function normalizeYbcMemberAlias(value: string): string | null {
  const unicodeNormalized = value.normalize("NFC");
  if (hasUnsafeYbcDisplayCharacters(unicodeNormalized)) return null;

  const normalized = unicodeNormalized.trim().replace(/\s+/gu, " ");
  const characterCount = Array.from(normalized).length;

  if (
    characterCount === 0 ||
    characterCount > YBC_MEMBER_ALIAS_MAX_LENGTH
  ) {
    return null;
  }

  return normalized;
}

export function loadYbcMemberAliases(
  storage: StorageLike | null
): YbcMemberAliases {
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(YBC_MEMBER_ALIASES_STORAGE_KEY);
    if (!rawValue) return {};
    if (rawValue.length > YBC_MEMBER_ALIASES_MAX_STORAGE_LENGTH) {
      removeStoredYbcMemberAliases(storage);
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isYbcMemberAliasesEnvelope(parsedValue)) return {};
    if (
      Object.keys(parsedValue.aliases).length >
      YBC_MEMBER_ALIASES_MAX_ENTRIES
    ) {
      removeStoredYbcMemberAliases(storage);
      return {};
    }

    return sanitizeYbcMemberAliases(parsedValue.aliases);
  } catch {
    return {};
  }
}

export function saveYbcMemberAliases(
  storage: StorageLike | null,
  aliases: YbcMemberAliases
): boolean {
  if (!storage) return false;
  if (Object.keys(aliases).length > YBC_MEMBER_ALIASES_MAX_ENTRIES) {
    return false;
  }

  const payload: YbcMemberAliasesEnvelope = {
    version: YBC_MEMBER_ALIASES_VERSION,
    aliases: sanitizeYbcMemberAliases(aliases),
  };
  if (
    Object.keys(payload.aliases).length > YBC_MEMBER_ALIASES_MAX_ENTRIES
  ) {
    return false;
  }

  try {
    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload.length > YBC_MEMBER_ALIASES_MAX_STORAGE_LENGTH) {
      return false;
    }

    storage.setItem(YBC_MEMBER_ALIASES_STORAGE_KEY, serializedPayload);
    return true;
  } catch {
    return false;
  }
}

export function clearYbcMemberAliases(storage: StorageLike | null): boolean {
  if (!storage) return false;

  try {
    storage.removeItem(YBC_MEMBER_ALIASES_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getYbcMemberPseudonym(address: string): string {
  const normalizedAddress = address.toLowerCase();
  const adjectiveHash = hashString(normalizedAddress);
  const animalHash = hashString([...normalizedAddress].reverse().join(""));

  return `${ADJECTIVES[adjectiveHash % ADJECTIVES.length]} ${
    ANIMALS[animalHash % ANIMALS.length]
  }`;
}

export function buildYbcGeneratedLabels(
  addresses: string[]
): Record<string, string> {
  const uniqueAddresses = [
    ...new Set(addresses.map((address) => address.toLowerCase())),
  ].sort();
  const addressesByPseudonym = new Map<string, string[]>();

  for (const address of uniqueAddresses) {
    const pseudonym = getYbcMemberPseudonym(address);
    const matchingAddresses = addressesByPseudonym.get(pseudonym) ?? [];
    matchingAddresses.push(address);
    addressesByPseudonym.set(pseudonym, matchingAddresses);
  }

  const labels: Record<string, string> = {};
  for (const [pseudonym, matchingAddresses] of addressesByPseudonym) {
    matchingAddresses.forEach((address, index) => {
      labels[address] = index === 0 ? pseudonym : `${pseudonym} ${index + 1}`;
    });
  }

  return labels;
}

function sanitizeYbcMemberAliases(
  aliases: YbcMemberAliases
): YbcMemberAliases {
  return Object.fromEntries(
    Object.entries(aliases)
      .slice(0, YBC_MEMBER_ALIASES_MAX_ENTRIES)
      .flatMap(([address, alias]) => {
        const normalizedAlias = normalizeYbcMemberAlias(alias);
        if (!isAddress(address) || !normalizedAlias) return [];

        return [[address.toLowerCase(), normalizedAlias]];
      })
  );
}

function removeStoredYbcMemberAliases(storage: StorageLike): void {
  try {
    storage.removeItem(YBC_MEMBER_ALIASES_STORAGE_KEY);
  } catch {
    // Reads should still fail closed when storage removal is blocked.
  }
}

function isYbcMemberAliasesEnvelope(
  value: unknown
): value is YbcMemberAliasesEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.version !== YBC_MEMBER_ALIASES_VERSION) return false;
  if (!record.aliases || typeof record.aliases !== "object") return false;
  if (Array.isArray(record.aliases)) return false;

  return Object.values(record.aliases).every(
    (alias) => typeof alias === "string"
  );
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
