import { describe, expect, it } from "vitest";
import {
  buildYbcIdentityMap,
  getYbcIdentity,
} from "@/app/ybc/identity";
import { getYbcMemberPseudonym } from "@/app/ybc/memberAliases";

const VISIBLE_ONLY_ADDRESS =
  "0x9999999999999999999999999999999999999999";

describe("YBC visible identity map", () => {
  it("applies aliases to addresses that are not roster or operator records", () => {
    const identities = buildYbcIdentityMap([], [], {
      aliases: {
        [VISIBLE_ONLY_ADDRESS]: "Proposal guest",
      },
      visibleAddresses: [VISIBLE_ONLY_ADDRESS],
    });

    expect(getYbcIdentity(identities, VISIBLE_ONLY_ADDRESS)).toEqual({
      address: VISIBLE_ONLY_ADDRESS,
      label: "Proposal guest",
      source: "local",
    });
  });

  it("disambiguates colliding generated labels in one visible-address pass", () => {
    const [firstAddress, secondAddress] = findGeneratedLabelCollision();
    const identities = buildYbcIdentityMap([], [], {
      visibleAddresses: [firstAddress, secondAddress],
    });
    const firstIdentity = getYbcIdentity(identities, firstAddress);
    const secondIdentity = getYbcIdentity(identities, secondAddress);

    expect(firstIdentity.source).toBe("generated");
    expect(secondIdentity.source).toBe("generated");
    expect(firstIdentity.label).not.toBe(secondIdentity.label);
    expect(firstIdentity.label).toContain(
      getYbcMemberPseudonym(firstAddress)
    );
    expect(secondIdentity.label).toContain(
      getYbcMemberPseudonym(secondAddress)
    );
    expect(firstIdentity.label).not.toContain("0x");
    expect(secondIdentity.label).not.toContain("0x");

    const reversedIdentities = buildYbcIdentityMap([], [], {
      visibleAddresses: [secondAddress, firstAddress],
    });
    expect(getYbcIdentity(reversedIdentities, firstAddress).label).toBe(
      firstIdentity.label
    );
    expect(getYbcIdentity(reversedIdentities, secondAddress).label).toBe(
      secondIdentity.label
    );
  });

  it("rejects unsafe aliases and trusted record ENS at the display boundary", () => {
    const identities = buildYbcIdentityMap(
      [
        {
          address: VISIBLE_ONLY_ADDRESS,
          ens: "unsafe\u{e0061}.eth",
        },
      ],
      [],
      {
        aliases: {
          [VISIBLE_ONLY_ADDRESS]: "unsafe\u2800alias",
        },
      }
    );

    expect(getYbcIdentity(identities, VISIBLE_ONLY_ADDRESS)).toMatchObject({
      label: getYbcMemberPseudonym(VISIBLE_ONLY_ADDRESS),
      source: "generated",
    });
  });
});

function findGeneratedLabelCollision(): [string, string] {
  const addressesByPseudonym = new Map<string, string>();

  for (const address of createSharedTagAddresses(145)) {
    const pseudonym = getYbcMemberPseudonym(address);
    const previousAddress = addressesByPseudonym.get(pseudonym);
    if (previousAddress) return [previousAddress, address];
    addressesByPseudonym.set(pseudonym, address);
  }

  throw new Error("Expected a deterministic generated-label collision.");
}

function createSharedTagAddresses(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const middle = (index + 1).toString(16).padStart(32, "0");
    return `0x1234${middle}abcd`;
  });
}
