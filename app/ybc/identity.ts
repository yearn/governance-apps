import { isAddress } from "viem";
import type {
  YbcMemberRecord,
  YbcOperatorRecord,
  YbcVerifiedEnsIdentities,
} from "@/lib/clients/ybc";
import { normalizeYbcEnsDisplayName } from "@/lib/clients/ybc";
import {
  buildYbcGeneratedLabels,
  getYbcMemberPseudonym,
  normalizeYbcMemberAlias,
  type YbcMemberAliases,
} from "./memberAliases";

export type YbcIdentitySource = "local" | "ens" | "generated";

export type YbcDisplayIdentity = {
  address: string;
  label: string;
  source: YbcIdentitySource;
};

export type YbcIdentityMap = Record<string, YbcDisplayIdentity>;

type IdentityRecord = Pick<YbcMemberRecord | YbcOperatorRecord, "address" | "ens">;

export type BuildYbcIdentityMapOptions = {
  aliases?: YbcMemberAliases;
  trustRecordEns?: boolean;
  verifiedEns?: YbcVerifiedEnsIdentities;
  visibleAddresses?: string[];
};

export function buildYbcIdentityMap(
  members: IdentityRecord[],
  operators: IdentityRecord[] = [],
  {
    aliases = {},
    trustRecordEns = true,
    verifiedEns = {},
    visibleAddresses = [],
  }: BuildYbcIdentityMapOptions = {}
): YbcIdentityMap {
  const recordsByAddress = new Map<string, IdentityRecord>();
  for (const address of [
    ...visibleAddresses,
    ...Object.keys(verifiedEns),
  ]) {
    if (isAddress(address)) {
      recordsByAddress.set(address.toLowerCase(), { address, ens: null });
    }
  }
  for (const record of [...operators, ...members]) {
    recordsByAddress.set(record.address.toLowerCase(), record);
  }

  const records = [...recordsByAddress.values()];
  const generatedLabels = buildYbcGeneratedLabels(
    records.map((record) => record.address)
  );

  return Object.fromEntries(
    records.map((record) => {
      const identity = getYbcBaseIdentity(
        record,
        {
          aliases,
          generatedLabel: generatedLabels[record.address.toLowerCase()],
          trustRecordEns,
          verifiedEns,
        }
      );
      return [identity.address.toLowerCase(), identity];
    })
  );
}

export function getYbcBaseIdentity(
  record: IdentityRecord,
  {
    aliases = {},
    generatedLabel,
    trustRecordEns = true,
    verifiedEns = {},
  }: BuildYbcIdentityMapOptions & {
    generatedLabel?: string;
  } = {}
): YbcDisplayIdentity {
  const normalizedAddress = record.address.toLowerCase();
  const aliasValue = aliases[normalizedAddress];
  const alias = aliasValue
    ? normalizeYbcMemberAlias(aliasValue)
    : null;
  if (alias) {
    return {
      address: record.address,
      label: alias,
      source: "local",
    };
  }

  const ensValue =
    verifiedEns[normalizedAddress] ??
    (trustRecordEns ? record.ens : null);
  const ensName = ensValue
    ? normalizeYbcEnsDisplayName(ensValue)
    : null;
  if (ensName) {
    return {
      address: record.address,
      label: ensName,
      source: "ens",
    };
  }

  return getYbcFallbackIdentity(record.address, generatedLabel);
}

export function getYbcIdentity(
  identities: YbcIdentityMap,
  address: string
): YbcDisplayIdentity {
  return identities[address.toLowerCase()] ?? getYbcFallbackIdentity(address);
}

function getYbcFallbackIdentity(
  address: string,
  generatedLabel?: string
): YbcDisplayIdentity {
  return {
    address,
    label: generatedLabel ?? getYbcMemberPseudonym(address),
    source: "generated",
  };
}
