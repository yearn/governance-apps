import { afterEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";
import { getYbcBaseIdentity } from "@/app/ybc/identity";
import {
  buildYbcGeneratedLabels,
  getYbcMemberPseudonym,
  loadYbcMemberAliases,
  normalizeYbcMemberAlias,
  saveYbcMemberAliases,
  YBC_MEMBER_ALIASES_MAX_ENTRIES,
  YBC_MEMBER_ALIASES_MAX_STORAGE_LENGTH,
  YBC_MEMBER_ALIASES_STORAGE_KEY,
  YBC_MEMBER_ALIASES_VERSION,
} from "@/app/ybc/memberAliases";

const MEMBER_ADDRESS =
  "0x52908400098527886e0f7030069857d2e4169ee7" satisfies Address;
const MEMBER_ADDRESS_UPPER =
  "0x52908400098527886E0F7030069857D2E4169EE7";

describe("YBC member aliases", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes safe labels and rejects invisible or control characters", () => {
    expect(normalizeYbcMemberAlias("  Clever   Fox  ")).toBe(
      "Clever Fox"
    );
    expect(normalizeYbcMemberAlias("Clever\u200bFox")).toBeNull();
    expect(normalizeYbcMemberAlias("Clever\u202eFox")).toBeNull();
    expect(normalizeYbcMemberAlias("Clever\nFox")).toBeNull();
  });

  it.each([
    ["soft hyphen", "\u00ad"],
    ["Hangul choseong filler", "\u115f"],
    ["Hangul jungseong filler", "\u1160"],
    ["Braille blank", "\u2800"],
    ["Hangul filler", "\u3164"],
    ["halfwidth Hangul filler", "\uffa0"],
    ["variation selector", "\ufe0f"],
    ["supplementary variation selector", "\u{e0100}"],
    ["Unicode tag", "\u{e0061}"],
    ["unassigned directional isolate", "\u2065"],
    ["ideographic space", "\u3000"],
  ])("rejects the %s character in a local alias", (_caseName, character) => {
    expect(normalizeYbcMemberAlias(`Clever${character}Fox`)).toBeNull();
  });

  it("loads only valid versioned aliases and normalizes address keys", () => {
    const storage = createStorage(
      JSON.stringify({
        version: YBC_MEMBER_ALIASES_VERSION,
        aliases: {
          [MEMBER_ADDRESS_UPPER]: "  Alice  ",
          invalid: "Ignored",
        },
      })
    );

    expect(loadYbcMemberAliases(storage)).toEqual({
      [MEMBER_ADDRESS]: "Alice",
    });
  });

  it("clears oversized raw storage before parsing it", () => {
    const storage = createStorage(
      "x".repeat(YBC_MEMBER_ALIASES_MAX_STORAGE_LENGTH + 1)
    );
    const parse = vi.spyOn(JSON, "parse");

    expect(loadYbcMemberAliases(storage)).toEqual({});
    expect(parse).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith(
      YBC_MEMBER_ALIASES_STORAGE_KEY
    );
  });

  it("clears stored maps whose cardinality exceeds policy", () => {
    const aliases = Object.fromEntries(
      createAddresses(YBC_MEMBER_ALIASES_MAX_ENTRIES + 1).map(
        (address, index) => [address, `Member ${index}`]
      )
    );
    const rawValue = JSON.stringify({
      version: YBC_MEMBER_ALIASES_VERSION,
      aliases,
    });
    expect(rawValue.length).toBeLessThan(
      YBC_MEMBER_ALIASES_MAX_STORAGE_LENGTH
    );
    const storage = createStorage(rawValue);

    expect(loadYbcMemberAliases(storage)).toEqual({});
    expect(storage.removeItem).toHaveBeenCalledWith(
      YBC_MEMBER_ALIASES_STORAGE_KEY
    );
  });

  it("refuses to claim success when a save exceeds cardinality policy", () => {
    const aliases = Object.fromEntries(
      createAddresses(YBC_MEMBER_ALIASES_MAX_ENTRIES + 1).map(
        (address, index) => [address, `Member ${index}`]
      )
    );
    const storage = createStorage();

    expect(saveYbcMemberAliases(storage, aliases)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("persists normalized aliases under lowercase addresses", () => {
    const storage = createStorage();

    expect(
      saveYbcMemberAliases(storage, {
        [MEMBER_ADDRESS_UPPER]: "  Alice  ",
      })
    ).toBe(true);
    expect(storage.setItem).toHaveBeenCalledOnce();

    const [, serializedPayload] = storage.setItem.mock.calls[0]!;
    expect(JSON.parse(serializedPayload)).toEqual({
      version: YBC_MEMBER_ALIASES_VERSION,
      aliases: {
        [MEMBER_ADDRESS]: "Alice",
      },
    });
  });

  it("uses local, verified ENS, trusted feed ENS, then generated identity", () => {
    const record: { address: Address; ens: string } = {
      address: MEMBER_ADDRESS,
      ens: "feed-name.eth",
    };

    expect(
      getYbcBaseIdentity(record, {
        aliases: { [MEMBER_ADDRESS]: "Local name" },
        verifiedEns: { [MEMBER_ADDRESS]: "verified.eth" },
      })
    ).toMatchObject({ label: "Local name", source: "local" });
    expect(
      getYbcBaseIdentity(record, {
        trustRecordEns: false,
        verifiedEns: { [MEMBER_ADDRESS]: "verified.eth" },
      })
    ).toMatchObject({ label: "verified.eth", source: "ens" });
    expect(getYbcBaseIdentity(record)).toMatchObject({
      label: "feed-name.eth",
      source: "ens",
    });
    expect(
      getYbcBaseIdentity(record, { trustRecordEns: false })
    ).toMatchObject({ source: "generated" });
  });

  it("assigns stable ordinals when generated pseudonyms collide", () => {
    const addressesByPseudonym = new Map<string, string[]>();
    let collision: [string, string] | null = null;

    for (const address of createSharedTagAddresses(145)) {
      const pseudonym = getYbcMemberPseudonym(address);
      const matching = addressesByPseudonym.get(pseudonym) ?? [];
      matching.push(address);
      addressesByPseudonym.set(pseudonym, matching);
      if (matching.length === 2) {
        collision = [matching[0]!, matching[1]!];
        break;
      }
    }

    expect(collision).not.toBeNull();
    const [firstAddress, secondAddress] = collision!;
    const labels = buildYbcGeneratedLabels([
      secondAddress,
      firstAddress,
    ]);
    const [firstSortedAddress, secondSortedAddress] = [
      firstAddress,
      secondAddress,
    ].sort();
    const pseudonym = getYbcMemberPseudonym(firstSortedAddress);

    expect(labels[firstSortedAddress]).toBe(pseudonym);
    expect(labels[secondSortedAddress]).toBe(`${pseudonym} 2`);
    expect(labels[firstSortedAddress]).not.toContain("0x");
    expect(labels[secondSortedAddress]).not.toContain("0x");
  });
});

function createStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    removeItem: vi.fn(() => {
      value = null;
    }),
    setItem: vi.fn((...parameters: [string, string]) => {
      value = parameters[1];
    }),
  };
}

function createAddresses(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const addressBody = (index + 1).toString(16).padStart(40, "0");
    return `0x${addressBody}`;
  });
}

function createSharedTagAddresses(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const middle = (index + 1).toString(16).padStart(32, "0");
    return `0x1234${middle}abcd`;
  });
}
