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

  it("falls back to default nav on launcher route", () => {
    expect(resolveHeaderPrimaryNav("/", null)).toEqual({
      label: "stYFI",
      path: "/styfi",
    });
  });
});
