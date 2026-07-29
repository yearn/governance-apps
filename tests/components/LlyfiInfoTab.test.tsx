import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LlyfiInfoTab } from "@/app/veyfi/components/tabs/LlyfiInfoTab";
import { type LlyfiTokenState } from "@/lib/clients/veyfi";
import { LIQUID_LOCKER_REDEMPTION_ADDRESS } from "@/lib/constants";

const ONE = 10n ** 18n;

const TOKEN: LlyfiTokenState = {
  symbol: "sdYFI",
  name: "StakeDAO",
  address: "0x1111111111111111111111111111111111111111",
  depositorAddress: "0x2222222222222222222222222222222222222222",
  walletBalance: 0n,
  stakedBalance: 0n,
  cooldownBalance: 0n,
  withdrawable: 0n,
  cooldown: null,
  allowance: 0n,
  redemptionAllowance: 0n,
  lockedYfi: 0n,
  veyfiBoost: 1,
  totalSupply: 0n,
  stakedAssets: 0n,
  depositorTotalSupply: 0n,
  depositorCapacity: 0n,
  exchangeRate: ONE,
  redemption: {
    enabled: true,
    capacity: 0n,
    used: 0n,
    inventory: 0n,
    fee: 0n,
  },
};

describe("LlyfiInfoTab", () => {
  it("renders token-specific contract links and redemption contract", () => {
    render(<LlyfiInfoTab token={TOKEN} />);

    expect(
      screen.getByText(
        "sdYFI represents YFI deposited into the StakeDAO liquid locker.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("sdYFI Token")).toBeInTheDocument();
    expect(screen.getByText("Depositor Contract")).toBeInTheDocument();
    expect(screen.getByText("Global Redemption Facility")).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${TOKEN.address} on Etherscan`,
      }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1111111111111111111111111111111111111111",
    );
    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${TOKEN.depositorAddress} on Etherscan`,
      }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x2222222222222222222222222222222222222222",
    );
    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${LIQUID_LOCKER_REDEMPTION_ADDRESS} on Etherscan`,
      }),
    ).toHaveAttribute(
      "href",
      `https://etherscan.io/address/${LIQUID_LOCKER_REDEMPTION_ADDRESS}`,
    );

  });
});
