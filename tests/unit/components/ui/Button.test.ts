import { describe, expect, it } from "vitest";
import { getButtonClassName } from "@/components/ui/Button";

describe("getButtonClassName", () => {
  it("builds shared button classes from variant and size", () => {
    const className = getButtonClassName({ variant: "secondary", size: "sm" });

    expect(className).toContain("rounded-box");
    expect(className).toContain("h-8");
    expect(className).toContain("bg-surface");
    expect(className).toContain("border-border");
  });

  it("appends caller-provided classes", () => {
    const className = getButtonClassName({ className: "custom-extra" });

    expect(className).toContain("custom-extra");
  });
});
