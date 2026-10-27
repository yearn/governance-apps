import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MembersTable } from "@/app/ybc/components/MembersTable";
import { YbcHero } from "@/app/ybc/components/YbcHero";
import { MemberWeightProgress } from "@/app/ybc/components/MemberWeightProgress";
import { buildYbcIdentityMap } from "@/app/ybc/identity";
import { cloneYbcMockScenarioData } from "@/lib/clients/ybc/mock";

const callbacks = { onSetAlias: vi.fn(), onResetAlias: vi.fn(), onClearAliases: vi.fn() };
describe("YBC member states", () => {
  beforeEach(() => window.localStorage.clear());
  it("renders no-stake, new, partial, and full activation in both saved views", () => {
    const data = cloneYbcMockScenarioData("observer");
    render(<MembersTable {...callbacks} aliases={{}} identities={buildYbcIdentityMap(data.roster.members)} roster={data.roster} />);
    const verify = () => {
      expect(screen.getByText("0 YFI staked. No weight to ramp.")).toBeVisible();
      expect(screen.getByText("0% active")).toBeVisible();
      expect(screen.getByText("50% active")).toBeVisible();
      expect(screen.getByText("75% active")).toBeVisible();
      expect(screen.getAllByText("100% active")).toHaveLength(2);
      expect(screen.getByText("250 weight still ramping")).toBeVisible();
      expect(screen.getByText("50 weight still ramping")).toBeVisible();
      expect(screen.getAllByRole("progressbar")).toHaveLength(5);
    };
    verify();
    fireEvent.click(screen.getByRole("button", { name: /Cards/ }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    verify();
  });
  it("keeps a connected empty member and an all-empty roster free of maturity claims", () => {
    const data = cloneYbcMockScenarioData("member-ramping");
    const zero = { rawStaked: "0", targetWeight: "0", effectiveWeight: "0", maturityBps: 10000, maturesAt: data.asOf + 86400 };
    data.me.weight = zero;
    data.roster.members = data.roster.members.map(member => ({ ...member, weight: zero }));
    data.roster.totals = { rawStaked: "0", effectiveWeight: "0", targetWeight: "0", rampingMemberCount: 0 };
    render(<><YbcHero data={data} /><MembersTable {...callbacks} aliases={{}} identities={buildYbcIdentityMap(data.roster.members)} roster={data.roster} /></>);
    expect(screen.getByText("No YFI staked yet")).toBeVisible();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/% active|Full weight on|Fully active/)).not.toBeInTheDocument();
  });
  it("retains removal status while suppressing active progress for a removed member", () => {
    const data = cloneYbcMockScenarioData("observer");
    const member = { ...data.roster.members[0]!, status: "removed" as const };
    render(<MemberWeightProgress weight={member.weight} removed />);
    expect(screen.getByText("Removed")).toBeVisible();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/weight still ramping/)).not.toBeInTheDocument();
  });
});
