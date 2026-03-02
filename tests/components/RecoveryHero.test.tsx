import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecoveryHero } from "@/app/yeth/components/RecoveryHero";

describe("RecoveryHero", () => {
  it("uses explicit dark-mode contrast classes for the recovered progress pill", () => {
    render(<RecoveryHero claimableEth={3_196_100_000_000_000_000n} recoveredPct="31.9%" />);

    const pill = screen.getByText("Recovered so far: 31.9%");
    expect(pill).toHaveClass("dark:bg-tokyo-600/30");
    expect(pill).toHaveClass("dark:text-tokyo-100");
    expect(pill).toHaveClass("dark:border-tokyo-100/35");
  });
});
