import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("keeps the default surface variant as the existing behavior", () => {
    render(<Card>Default card</Card>);

    const card = screen.getByText("Default card");
    expect(card.className).toContain("bg-surface");
    expect(card.className).toContain("border-border");
    expect(card.className).toContain("shadow-sm");
  });

  it("supports the flat secondary surface variant", () => {
    render(<Card variant="flat">Flat card</Card>);

    const card = screen.getByText("Flat card");
    expect(card.className).toContain("bg-surface-secondary/50");
    expect(card.className).toContain("border-transparent");
    expect(card.className).toContain("shadow-none");
  });
});
