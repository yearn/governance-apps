import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MembersTable } from "@/app/ybc/components/MembersTable";
import { YbcHero } from "@/app/ybc/components/YbcHero";
import { MemberPosition } from "@/app/ybc/components/MemberPosition";
import { buildYbcIdentityMap } from "@/app/ybc/identity";
import { cloneYbcMockScenarioData } from "@/lib/clients/ybc/mock";

const callbacks = { onSetAlias: vi.fn(), onResetAlias: vi.fn(), onClearAliases: vi.fn() };
describe("YBC member positions", () => {
  beforeEach(() => window.localStorage.clear());
  it("shows activation and withdrawals independently, with dates instead of progress bars", () => {
    const data = cloneYbcMockScenarioData("observer");
    render(<MembersTable {...callbacks} aliases={{}} identities={buildYbcIdentityMap(data.roster.members, [], { trustRecordEns: true })} roster={data.roster} power={data.governancePower} />);
    const row = (suffix: string) => screen.getByRole("table").querySelector('[data-member-address="0x000000000000000000000000000000000000' + suffix + '"]') as HTMLElement;
    expect(within(row("0101")).getByText("No stake")).toBeVisible();
    expect(within(row("0102")).getByText(/Activating/)).toBeVisible();
    expect(within(row("0102")).getByText(/Full weight/)).toBeVisible();
    expect(within(row("0103")).getByText(/Activating/)).toBeVisible();
    expect(within(row("0103")).getByText(/Unstaking/)).toBeVisible();
    expect(within(row("0104")).getByText("No stake")).toBeVisible();
    expect(within(row("0104")).getByText(/Unstaking/)).toBeVisible();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("supports focus and click selection in the distribution, including zero-weight members", () => {
    const data = cloneYbcMockScenarioData("observer");
    render(<MembersTable {...callbacks} aliases={{}} identities={buildYbcIdentityMap(data.roster.members, [], { trustRecordEns: true })} roster={data.roster} power={data.governancePower} />);
    fireEvent.click(screen.getByRole("button", { name: "Distribution" }));
    const slice = screen.getByRole("button", { name: /alice-ybc.eth:.*of YBC weight/ });
    fireEvent.focus(slice);
    expect(slice).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Selected member")).toBeVisible();
    expect(screen.getByText("Weight at full activation")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "claire-ybc.eth, 0%" }));
    expect(screen.getByText("No active stake")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("renders an empty distribution and no maturity claims for zero stake", () => {
    const data = cloneYbcMockScenarioData("member-ramping");
    const zero = { rawStaked: "0", targetWeight: "0", effectiveWeight: "0", maturityBps: 10000, maturesAt: data.asOf + 86400 };
    data.me.weight = zero;
    data.roster.members = data.roster.members.map(member => ({ ...member, weight: zero }));
    data.roster.totals = { rawStaked: "0", effectiveWeight: "0", targetWeight: "0", rampingMemberCount: 0 };
    render(<MembersTable {...callbacks} aliases={{}} identities={buildYbcIdentityMap(data.roster.members, [], { trustRecordEns: true })} roster={data.roster} />);
    expect(screen.queryByText(/^↑ Activating$/)).not.toBeInTheDocument();
    expect(document.querySelector("time")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Distribution" }));
    expect(screen.getByText("No voting weight yet")).toBeVisible();
    expect(screen.queryByRole("button", { name: /of YBC weight/ })).not.toBeInTheDocument();
  });
  it("does not turn unavailable DAO power into zero or the internal weight total", () => {
    const data = cloneYbcMockScenarioData("observer");
    render(<YbcHero data={data} power={null} systemPower={null} />);
    expect(screen.getByText("DAO power breakdown unavailable")).toBeVisible();
    expect(screen.queryByText("5,800")).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(1);
  });
  it("shows one YBC headline and a full-system bar, with the split in accessible help", () => {
    const data = cloneYbcMockScenarioData("observer");
    const { rerender } = render(<YbcHero data={data} />);
    expect(screen.getByText("Available YBC voting power")).toBeVisible();
    expect(screen.getByText("40.45%")).toBeVisible();
    expect(screen.getByText("40,000")).toBeVisible();
    expect(screen.getByText("Members’ own power").closest("[role=tooltip]")).toHaveClass("invisible");
    fireEvent.click(screen.getByRole("button", { name: "YBC share of DAO voting power: show breakdown" }));
    expect(screen.getByText("Members’ own power")).toBeVisible();
    expect(screen.getByText("Power steered by YBC")).toBeVisible();
    expect(document.querySelector('[data-vote-segment="yea"]')).toHaveStyle({ width: "15.45%" });
    expect(document.querySelector('[data-vote-segment="ybc-yea"]')).toHaveStyle({ width: "25%" });
    rerender(<YbcHero data={data} systemPower={null} />);
    expect(screen.getByText("DAO share unavailable")).toBeVisible();
    expect(screen.getByText("16,180")).toBeVisible();
    expect(document.querySelector("[data-vote-segment]")).toBeNull();
    rerender(<YbcHero data={data} systemPower={{ ...data.systemPower!, daoTotalPower: "0" }} />);
    expect(screen.getByText("DAO share unavailable")).toBeVisible();
    expect(document.querySelector("[data-vote-segment]")).toBeNull();
  });
  it("keeps withdrawal status unknown when member facts are unavailable", () => {
    const data = cloneYbcMockScenarioData("observer");
    const member = data.roster.members[0]!;
    const { rerender } = render(<MemberPosition member={member} />);
    expect(screen.getByText("Withdrawal status unavailable")).toBeVisible();
    rerender(<MemberPosition member={member} facts={{ directPower: "0", exiting: "0", maturesAt: null }} />);
    expect(screen.queryByText("Withdrawal status unavailable")).not.toBeInTheDocument();
  });
  it("reopens each help control after Escape without requiring another focus target", () => {
    const data = cloneYbcMockScenarioData("observer");
    render(<>
      <YbcHero data={data} />
      <MemberPosition member={data.roster.members[1]!} facts={{directPower:"1200",exiting:"100",maturesAt:null}} />
    </>);
    for (const button of screen.getAllByRole("button")) {
      const tooltip = document.getElementById(button.getAttribute("aria-describedby")!)!;
      fireEvent.click(button);
      expect(button).toHaveFocus();
      expect(tooltip).toHaveClass("visible");
      fireEvent.keyDown(button, {key:"Escape"});
      expect(button).not.toHaveFocus();
      expect(tooltip).toHaveClass("invisible");
      fireEvent.click(button);
      expect(tooltip).toHaveClass("visible");
      fireEvent.keyDown(button, {key:"Escape"});
    }
  });
  it("suppresses activation claims for removed members and sub-precision dust", () => {
    const data = cloneYbcMockScenarioData("observer");
    const { rerender } = render(<MemberPosition member={{ ...data.roster.members[0]!, status: "removed" }} />);
    expect(screen.getByText("Removed")).toBeVisible();
    expect(screen.queryByText(/Full weight/)).not.toBeInTheDocument();
    rerender(<MemberPosition member={{ ...data.roster.members[0]!, weight: {rawStaked:"0.000000000000000001",targetWeight:"0",effectiveWeight:"0",maturityBps:0,maturesAt:null} }} />);
    expect(screen.getByText("Below voting precision")).toBeVisible();
    expect(screen.queryByText(/Activating/)).not.toBeInTheDocument();
  });
});
