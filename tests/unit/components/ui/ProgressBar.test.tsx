import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "@/components/ui/ProgressBar";

describe("ProgressBar", () => {
  it("supports the yeth variant and clamps over-max values", () => {
    const { container } = render(<ProgressBar value={150} variant="yeth" />);

    const wrapper = container.firstElementChild as HTMLElement;
    const fill = wrapper.firstElementChild as HTMLElement;

    expect(fill.className).toContain("bg-tokyo-600");
    expect(fill).toHaveStyle({ width: "100%" });
  });
});
