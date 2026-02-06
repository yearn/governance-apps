import { describe, expect, it } from "vitest";
import {
  resolveGovernanceAppHref,
  resolveGovernanceHref,
} from "@/lib/governance-links";

describe("resolveGovernanceAppHref", () => {
  it("keeps app links path-scoped on shared dev hosts", () => {
    expect(resolveGovernanceAppHref("styfi", "localhost")).toBe("/styfi");
    expect(resolveGovernanceAppHref("veyfi", "127.0.0.1:3000")).toBe("/veyfi");
    expect(resolveGovernanceAppHref("yeth", "app.dao-ops.com")).toBe("/yeth");
  });

  it("resolves canonical app subdomains on yearn.fi hosts", () => {
    expect(resolveGovernanceAppHref("styfi", "veyfi.yearn.fi")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveGovernanceAppHref("veyfi", "yeth.yearn.fi")).toBe(
      "https://veyfi.yearn.fi"
    );
    expect(resolveGovernanceAppHref("yeth", "styfi.yearn.fi")).toBe(
      "https://yeth.yearn.fi"
    );
  });

  it("falls back to path links when hostname is unknown", () => {
    expect(resolveGovernanceAppHref("styfi")).toBe("/styfi");
    expect(resolveGovernanceAppHref("styfi", "example.com")).toBe("/styfi");
  });
});

describe("resolveGovernanceHref", () => {
  it("rewrites app hrefs to canonical subdomains on prod hosts", () => {
    expect(resolveGovernanceHref("/styfi", "veyfi.yearn.fi")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveGovernanceHref("/veyfi/", "styfi.yearn.fi")).toBe(
      "https://veyfi.yearn.fi"
    );
    expect(resolveGovernanceHref("/yeth", "app.yearn.fi")).toBe(
      "https://yeth.yearn.fi"
    );
  });

  it("keeps app hrefs path-scoped on localhost and dao-ops hosts", () => {
    expect(resolveGovernanceHref("/styfi", "localhost:3000")).toBe("/styfi");
    expect(resolveGovernanceHref("/veyfi", "app.dao-ops.com")).toBe("/veyfi");
    expect(resolveGovernanceHref("/yeth", "127.0.0.1")).toBe("/yeth");
  });

  it("leaves non-app links unchanged", () => {
    expect(resolveGovernanceHref("https://yearn.fi", "veyfi.yearn.fi")).toBe(
      "https://yearn.fi"
    );
    expect(resolveGovernanceHref("/vaults", "veyfi.yearn.fi")).toBe("/vaults");
  });
});
