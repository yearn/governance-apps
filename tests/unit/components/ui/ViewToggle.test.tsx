import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewToggle } from "@/components/ui/ViewToggle";

describe("ViewToggle", () => {
  it("marks the active view and calls onChange for another view", () => {
    const onChange = vi.fn();

    render(
      <ViewToggle
        aria-label="Roster view"
        value="visual"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: /visual/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(onChange).toHaveBeenCalledWith("audit");
  });
});
