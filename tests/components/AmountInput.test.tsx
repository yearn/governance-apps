import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AmountInput } from "@/components/ui/AmountInput";
import { renderWithProviders } from "@/tests/test-utils";

const LONG_SYMBOL =
  "SUPERCALIFRAGILISTICEXPIALIDOCIOUSYEARNREVENUEVAULTTOKEN";

describe("AmountInput", () => {
  it("keeps a long token label, decimal entry, and both Max actions usable", async () => {
    const user = userEvent.setup();
    const onMaxClick = vi.fn();

    function AmountInputHarness() {
      const [value, setValue] = useState("");

      return (
        <AmountInput
          aria-label="Deposit amount"
          value={value}
          onChange={setValue}
          onMaxClick={onMaxClick}
          maxLabel={`Balance: 12345678901234567890.123456789 ${LONG_SYMBOL}`}
          tokenSymbol={LONG_SYMBOL}
        />
      );
    }

    renderWithProviders(<AmountInputHarness />);

    const input = screen.getByRole("textbox", { name: "Deposit amount" });
    await user.type(input, "12.345");
    expect(input).toHaveValue("12.345");
    const tokenLabel = screen.getByText(LONG_SYMBOL);
    expect(tokenLabel).toBeVisible();
    expect(tokenLabel).toHaveClass("truncate", "whitespace-nowrap");
    expect(tokenLabel).not.toHaveClass("break-words", "[overflow-wrap:anywhere]");
    expect(tokenLabel).toHaveAttribute("title", LONG_SYMBOL);

    await user.click(screen.getByRole("button", { name: "Max" }));
    await user.click(
      screen.getByRole("button", {
        name: `Balance: 12345678901234567890.123456789 ${LONG_SYMBOL}`,
      })
    );
    expect(onMaxClick).toHaveBeenCalledTimes(2);
  });
});
