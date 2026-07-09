import { describe, expect, it } from "vitest";
import { getButtonClassName } from "@/components/ui/Button";

describe("getButtonClassName", () => {
  it("builds shared button classes from variant and size", () => {
    const className = getButtonClassName({ variant: "secondary", size: "sm" });

    expect(className).toContain("rounded-box");
    expect(className).toContain("h-10");
    expect(className).toContain("bg-surface");
    expect(className).toContain("border-border");
    expect(className).toContain("active:scale-[0.96]");
  });

  it("appends caller-provided classes", () => {
    const className = getButtonClassName({ className: "custom-extra" });

    expect(className).toContain("custom-extra");
  });

  it("supports the yeth variant classes", () => {
    const className = getButtonClassName({ variant: "yeth", size: "lg" });

    expect(className).toContain("bg-tokyo-600");
    expect(className).toContain("hover:bg-tokyo-700");
    expect(className).toContain("h-14");
  });

  it("can disable press scaling for static buttons", () => {
    const className = getButtonClassName({ static: true });

    expect(className).not.toContain("active:scale-[0.96]");
  });
});
