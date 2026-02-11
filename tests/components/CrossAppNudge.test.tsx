import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CrossAppNudge } from "@/components/domain/CrossAppNudge";

describe("CrossAppNudge", () => {
  it("uses row-collapse animation classes instead of fixed min-height", () => {
    const { container } = render(
      <CrossAppNudge nudge={null} onDismiss={vi.fn()} />
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("grid-rows-[0fr]");
    expect(root.className).not.toContain("min-h-[92px]");
  });

  it("renders nudge content and dismisses with the X action", () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <CrossAppNudge
        nudge={{
          id: "nudge_test",
          title: "Optimization available",
          body: "You have unstaked LLYFI.",
          ctaLabel: "Visit veYFI website",
          href: "/veyfi?focus=stake",
          targetApp: "veyfi",
          priority: 80,
        }}
        onDismiss={onDismiss}
      />
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("grid-rows-[1fr]");
    expect(screen.getByText("Optimization available")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /visit veyfi website/i });
    const ctaLink = cta.closest("a");
    expect(ctaLink).toHaveAttribute("target", "_blank");
    expect(ctaLink).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.click(screen.getByLabelText("Dismiss nudge"));
    expect(onDismiss).toHaveBeenCalledWith("nudge_test");
  });
});
