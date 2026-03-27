import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "@/components/ui/Tooltip";

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the popover open while moving from the trigger into the tooltip surface", () => {
    render(
      <Tooltip content="Tooltip body">
        <button type="button">Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" });
    const tooltip = screen.getByRole("tooltip");

    fireEvent.mouseEnter(trigger);
    expect(tooltip.className).toContain("pointer-events-auto");

    fireEvent.mouseLeave(trigger);
    expect(tooltip.className).toContain("pointer-events-auto");

    act(() => {
      vi.advanceTimersByTime(50);
    });
    fireEvent.mouseEnter(tooltip);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(tooltip.className).toContain("pointer-events-auto");
    expect(tooltip.className).not.toContain("pointer-events-none");
  });

  it("hides after leaving both the trigger and the tooltip", () => {
    render(
      <Tooltip content="Tooltip body">
        <button type="button">Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByRole("button", { name: "Trigger" });
    const tooltip = screen.getByRole("tooltip");

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(tooltip.className).toContain("pointer-events-none");
  });
});
