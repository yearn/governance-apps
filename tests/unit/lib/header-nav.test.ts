import { describe, expect, it } from "vitest";
import { resolveHeaderPrimaryNav } from "@/lib/header-nav";

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

  it("keeps path-scoped yETH routes for shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/yeth", "yeth")).toEqual({
      label: "yETH",
      path: "/yeth",
    });
  });

  it("falls back to pathname when segment is unavailable", () => {
    expect(resolveHeaderPrimaryNav("/veyfi/portfolio", null)).toEqual({
      label: "veYFI",
      path: "/veyfi",
    });
  });

  it("falls back to yETH from pathname when segment is unavailable", () => {
    expect(resolveHeaderPrimaryNav("/yeth/recovery", null)).toEqual({
      label: "yETH",
      path: "/yeth",
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

  it("keeps app label empty for unknown paths on shared hosts", () => {
    expect(resolveHeaderPrimaryNav("/does-not-exist", null, "app.dao-ops.com")).toEqual({
      label: "",
      path: "/",
    });
  });
});
