import { describe, expect, it } from "vitest";
import {
  resolveHeaderAppKey,
  resolveHeaderPrimaryNav,
} from "@/lib/header-nav";

describe("resolveHeaderPrimaryNav", () => {
  it("resolves branded stYFI host routes to root nav href", () => {
    expect(resolveHeaderPrimaryNav("/", "styfi")).toEqual({
      label: "stYFI",
      path: "/",
    });
  });

  it("resolves branded veYFI host routes to root nav href", () => {
    expect(resolveHeaderPrimaryNav("/", "veyfi")).toEqual({
      label: "veYFI",
      path: "/",
    });
  });

  it("keeps path-scoped stYFI routes for shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/styfi", "styfi")).toEqual({
      label: "stYFI",
      path: "/styfi",
    });
  });

  it("keeps path-scoped veYFI routes for shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/veyfi", "veyfi")).toEqual({
      label: "veYFI",
      path: "/veyfi",
    });
  });

  it("keeps path-scoped Team Finances routes for shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/teams", "teams")).toEqual({
      label: "Team Finances",
      path: "/teams",
    });
  });

  it("keeps path-scoped yETH routes for shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/yeth", "yeth")).toEqual({
      label: "yETH",
      path: "/yeth",
    });
  });

  it("keeps path-scoped ybc routes for shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/ybc", "ybc")).toEqual({
      label: "Yearn Builder's Collective",
      path: "/ybc",
    });
  });

  it("keeps DAO Governance path-scoped on shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/dao/proposals/2", "dao")).toEqual({
      label: "DAO Governance",
      path: "/dao",
    });
  });

  it("uses clean root navigation on the guarded DAO beta host", () => {
    expect(
      resolveHeaderPrimaryNav("/proposals/2", null, "dao-beta.dao-ops.com")
    ).toEqual({
      label: "DAO Governance",
      path: "/",
    });
  });

  it("falls back to pathname when segment is unavailable", () => {
    expect(resolveHeaderPrimaryNav("/veyfi/portfolio", null)).toEqual({
      label: "veYFI",
      path: "/veyfi",
    });
  });

  it("falls back to Team Finances from pathname when segment is unavailable", () => {
    expect(resolveHeaderPrimaryNav("/teams/platform", null)).toEqual({
      label: "Team Finances",
      path: "/teams",
    });
  });

  it("falls back to yETH from pathname when segment is unavailable", () => {
    expect(resolveHeaderPrimaryNav("/yeth/recovery", null)).toEqual({
      label: "yETH",
      path: "/yeth",
    });
  });

  it("falls back to ybc from pathname when segment is unavailable", () => {
    expect(resolveHeaderPrimaryNav("/ybc/members", null)).toEqual({
      label: "Yearn Builder's Collective",
      path: "/ybc",
    });
  });

  it("does not show an app label for unknown launcher routes", () => {
    expect(resolveHeaderPrimaryNav("/", null)).toEqual({
      label: "",
      path: "/",
    });
  });

  it("infers app label from branded host when pathname is unknown", () => {
    expect(resolveHeaderPrimaryNav("/does-not-exist", null, "veyfi.yearn.fi")).toEqual({
      label: "veYFI",
      path: "/",
    });
  });

  it("infers Team Finances label from branded host when pathname is unknown", () => {
    expect(resolveHeaderPrimaryNav("/does-not-exist", null, "teams.yearn.fi")).toEqual({
      label: "Team Finances",
      path: "/",
    });
  });

  it("keeps app label empty for unknown paths on shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/does-not-exist", null, "app.dao-ops.com")).toEqual({
      label: "",
      path: "/",
    });
  });
});

describe("resolveHeaderAppKey", () => {
  it("resolves preprod product subdomains for route-scoped data loading", () => {
    expect(resolveHeaderAppKey("/", null, "styfi-beta.dao-ops.com")).toBe(
      "styfi"
    );
    expect(resolveHeaderAppKey("/", null, "veyfi-beta.dao-ops.com")).toBe(
      "veyfi"
    );
    expect(resolveHeaderAppKey("/", null, "yeth-beta.dao-ops.com")).toBe(
      "yeth"
    );
    expect(resolveHeaderAppKey("/propose", null, "dao-beta.dao-ops.com")).toBe(
      "dao"
    );
  });

  it("resolves product path prefixes for shared hosts", () => {
    expect(resolveHeaderAppKey("/styfi", null, "app.dao-ops.com")).toBe(
      "styfi"
    );
    expect(resolveHeaderAppKey("/veyfi", null, "app.dao-ops.com")).toBe(
      "veyfi"
    );
    expect(resolveHeaderAppKey("/yeth", null, "app.dao-ops.com")).toBe("yeth");
    expect(resolveHeaderAppKey("/dao/propose", null, "app.dao-ops.com")).toBe(
      "dao"
    );
  });

  it("does not treat similarly named launcher paths as DAO routes", () => {
    expect(resolveHeaderAppKey("/daoish", null, "app.dao-ops.com")).toBeNull();
    expect(
      resolveHeaderAppKey("/dao-governance", null, "app.dao-ops.com")
    ).toBeNull();
  });
});
