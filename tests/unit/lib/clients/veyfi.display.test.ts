import { describe, expect, it } from "vitest";
import {
  getLlyfiDisplaySymbol,
  normalizeLlyfiSymbol,
} from "@/lib/clients/veyfi/display";

describe("veYFI symbol helpers", () => {
  it("normalizes supYFI to internal upYFI", () => {
    expect(normalizeLlyfiSymbol("supYFI")).toBe("upYFI");
  });

  it("normalizes symbol aliases case-insensitively", () => {
    expect(normalizeLlyfiSymbol("SUPYFI")).toBe("upYFI");
    expect(normalizeLlyfiSymbol("upyfi")).toBe("upYFI");
    expect(normalizeLlyfiSymbol("COVEYFI")).toBe("coveYFI");
  });

  it("trims symbol input before normalization", () => {
    expect(normalizeLlyfiSymbol(" supYFI ")).toBe("upYFI");
  });

  it("keeps canonical symbols stable", () => {
    expect(normalizeLlyfiSymbol("sdYFI")).toBe("sdYFI");
  });

  it("renders the preferred display symbol", () => {
    expect(getLlyfiDisplaySymbol("upYFI")).toBe("supYFI");
    expect(getLlyfiDisplaySymbol("supYFI")).toBe("supYFI");
  });
});
