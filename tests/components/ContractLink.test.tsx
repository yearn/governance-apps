import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContractLink } from "@/components/ui/ContractLink";
import {
  AddressLink,
  TransactionLink,
} from "@/components/ui/ExplorerLink";

describe("ContractLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => false),
      configurable: true,
    });
  });

  it("preserves the compact legacy contract treatment and footprint", () => {
    const address = "0x1234567890123456789012345678901234567890";
    const { container } = render(<ContractLink address={address} />);

    const link = screen.getByRole("link", {
      name: `View Ethereum address ${address} on Etherscan`,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1234567890123456789012345678901234567890",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).not.toHaveClass("min-h-10", "min-w-10");

    const visibleAddress = screen.getByText("0x1234...7890");
    expect(visibleAddress).toHaveClass(
      "rounded",
      "border",
      "bg-surface-secondary",
      "px-1.5",
      "py-0.5",
      "text-[11px]",
    );
    expect(visibleAddress.closest("span")).toHaveClass(
      "group/contract",
      "gap-1.5",
    );
    expect(container.querySelectorAll("a")).toHaveLength(2);
    expect(
      screen.getByRole("link", {
        name: `Open Ethereum address ${address} in Etherscan`,
      }),
    ).toHaveClass("p-0.5");
  });

  it("copies the full address and announces only confirmed success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const address = "0x1234567890123456789012345678901234567890";
    render(<ContractLink address={address} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy contract address" }),
      );
    });

    expect(writeText).toHaveBeenCalledWith(address);
    expect(screen.getByRole("status")).toHaveTextContent("address copied");
    expect(
      screen.getByRole("button", { name: "Copy contract address" }),
    ).toHaveClass("p-0.5");
  });

  it("does not announce copy success when both clipboard paths fail", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const address = "0x1234567890123456789012345678901234567890";
    render(<ContractLink address={address} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy contract address" }),
      );
    });

    expect(writeText).toHaveBeenCalledWith(address);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(
      screen.getByRole("button", { name: "Copy contract address" }),
    ).toHaveAttribute("title", "Copy address");
  });

  it("keeps malformed contract values visible and non-interactive", () => {
    render(<ContractLink address="0xnot-an-address" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByTitle("Invalid Ethereum address: 0xnot-an-address"),
    ).toHaveTextContent("0xnot-...ress");
  });
});

describe("ExplorerLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => false),
      configurable: true,
    });
  });

  it("renders a full accessible name for a short visible address label", () => {
    const address = "0x1234567890123456789012345678901234567890";
    render(<AddressLink address={address} label="Treasury" />);

    const link = screen.getByRole("link", {
      name: `View Ethereum address ${address} on Etherscan`,
    });
    expect(link).toHaveTextContent("Treasury");
    expect(link).toHaveClass("min-h-10", "min-w-10");
  });

  it("keeps compact identity links crisp while reserving usable contextual actions", () => {
    const address = "0x1234567890123456789012345678901234567890";
    render(
      <AddressLink
        address={address}
        label="Team treasury"
        variant="compact"
      />,
    );

    const link = screen.getByRole("link", {
      name: `View Ethereum address ${address} on Etherscan`,
    });
    const copy = screen.getByRole("button", { name: "Copy address" });
    const visibleLabel = screen.getByText("Team treasury");

    expect(link).toHaveClass("relative", "z-10", "min-h-10");
    expect(link).not.toHaveClass("min-w-10");
    expect(link).not.toHaveClass("font-number");
    expect(visibleLabel.tagName).toBe("SPAN");
    expect(visibleLabel).not.toHaveClass(
      "border",
      "bg-surface-secondary",
      "px-1.5",
    );
    expect(link.parentElement).toHaveClass(
      "relative",
      "[@media(pointer:fine)]:pr-10",
    );
    expect(link.parentElement).not.toHaveClass("pr-10");
    expect(copy).toHaveClass(
      "absolute",
      "z-20",
      "hidden",
      "[@media(pointer:fine)]:inline-flex",
      "size-10",
      "opacity-0",
      "group-hover/explorer:pointer-events-auto",
      "group-hover/explorer:opacity-100",
      "focus:pointer-events-auto",
      "focus:opacity-100",
    );
    expect(copy).not.toHaveClass("blur-[4px]", "scale-[0.25]");
    expect(link.querySelector("svg")).not.toHaveClass(
      "blur-[4px]",
      "scale-[0.25]",
    );
  });

  it("keeps an unlabeled compact address in monospaced code", () => {
    const address = "0x1234567890123456789012345678901234567890";
    render(<AddressLink address={address} variant="compact" />);

    const visibleAddress = screen.getByText("0x1234...7890");
    expect(visibleAddress.tagName).toBe("CODE");
    expect(visibleAddress).toHaveClass("font-number");
  });

  it("copies a full address and announces confirmed success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const address = "0x1234567890123456789012345678901234567890";
    render(<AddressLink address={address} label="Treasury" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
    });

    expect(writeText).toHaveBeenCalledWith(address);
    expect(screen.getByRole("status")).toHaveTextContent("address copied");
  });

  it("renders one secure transaction link with separate non-colliding actions", () => {
    const hash =
      "0x1234567890123456789012345678901234567890123456789012345678901234";
    render(<TransactionLink hash={hash} />);

    const link = screen.getByRole("link", {
      name: `View Ethereum transaction ${hash} on Etherscan`,
    });
    const copy = screen.getByRole("button", {
      name: "Copy transaction hash",
    });
    expect(link).toHaveAttribute("href", `https://etherscan.io/tx/${hash}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("min-h-10", "min-w-10");
    expect(copy).toHaveClass("size-10", "shrink-0");
    expect(copy).not.toHaveClass("opacity-0");
    expect(link.querySelector("svg")).not.toHaveClass("opacity-0");
    expect(link.parentElement).toHaveClass("gap-1.5");
  });

  it("copies the full transaction hash", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const hash =
      "0x1234567890123456789012345678901234567890123456789012345678901234";
    render(<TransactionLink hash={hash} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy transaction hash" }),
      );
    });

    expect(writeText).toHaveBeenCalledWith(hash);
    expect(screen.getByRole("status")).toHaveTextContent(
      "transaction hash copied",
    );
  });

  it("does not announce success when explorer-link copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const address = "0x1234567890123456789012345678901234567890";
    render(<AddressLink address={address} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
    });

    expect(writeText).toHaveBeenCalledWith(address);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps malformed explorer values visible and non-interactive", () => {
    render(
      <TransactionLink hash="0xnot-a-hash" label="Trusted transaction" />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByTitle(
        "Invalid Ethereum transaction hash: 0xnot-a-hash",
      ),
    ).toHaveTextContent("0xnot-a-hash");
    expect(screen.queryByText("Trusted transaction")).not.toBeInTheDocument();
  });
});
