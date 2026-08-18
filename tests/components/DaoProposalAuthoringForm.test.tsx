import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  DAO_EXECUTOR_VALID_SCRIPT_VECTORS,
  deriveDaoProposerState,
  getDaoMockFixture,
  type DaoProposerEligibilityInput,
} from "@/lib/clients/dao";
import {
  DaoProposalAuthoringForm,
  DaoProposalEligibility,
} from "@/app/dao/propose/DaoProposalAuthoringForm";

const NOW = getDaoMockFixture("discussion").now;

describe("DAO proposal authoring form", () => {
  it("connects accessible field errors and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    renderAuthoring();

    await user.click(screen.getByRole("button", { name: "Review proposal" }));

    expect(screen.getByText("Review the highlighted fields")).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Forum discussion" })
      ).toHaveFocus()
    );
    expect(
      screen.getByRole("textbox", { name: "Forum discussion" })
    ).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute(
      "aria-describedby",
      "dao-proposal-title-help dao-proposal-title-error"
    );
  });

  it("shows fixed parser code, byte offset, counts, targets, and hash", async () => {
    const user = userEvent.setup();
    renderAuthoring();

    await user.click(
      screen.getByRole("radio", { name: /^ExecutableIncludes/i })
    );
    const script = screen.getByRole("textbox", {
      name: "Full Executor script",
    });
    await user.clear(script);
    await user.type(script, `0x${"00".repeat(31)}`);

    expect(screen.getByText("TRUNCATED_HEADER")).toBeVisible();
    expect(screen.getByText("Byte offset")).toBeVisible();
    expect(screen.getByText("Byte offset").parentElement).toHaveTextContent(
      "Byte offset0"
    );

    await user.clear(script);
    await user.type(script, DAO_EXECUTOR_VALID_SCRIPT_VECTORS.twoCalls.script);

    expect(screen.getByText("Script structure is valid")).toBeVisible();
    expect(screen.getByText("Call 1")).toBeVisible();
    expect(screen.getByText("Call 2")).toBeVisible();
    expect(screen.getAllByText(/0x[0-9a-f]{40}/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Script hash")).toBeVisible();
  });

  it("publishes a Signal snapshot before starting the wallet step", async () => {
    const user = userEvent.setup();
    renderAuthoring();
    await fillDraft(user, 1001);

    await user.click(screen.getByRole("button", { name: "Review proposal" }));
    expect(
      screen.getByRole("heading", { name: "Review the exact proposal" })
    ).toBeVisible();
    expect(screen.getByText("No executable actions")).toBeVisible();
    expect(screen.getByText("Exact proposal title")).toBeVisible();
    expect(screen.getByText("Exact summary")).toBeVisible();
    expect(screen.getByText("Exact specification")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Publish proposal content" })
    );
    expect(
      screen.getByText("Confirm the exact review before publication.")
    ).toBeVisible();

    await user.click(
      screen.getByRole("checkbox", {
        name: /I reviewed the exact immutable content/i,
      })
    );
    await user.click(
      screen.getByRole("button", { name: "Publish proposal content" })
    );

    expect(
      await screen.findByText("Proposal content published")
    ).toBeVisible();
    expect(screen.getByText("The wallet step has not started yet.", { exact: false })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Create onchain proposal" })
    );
    expect(
      await screen.findByText("Proposal transaction submitted")
    ).toBeVisible();
    expect(
      screen.getByText(/Waiting for proposal indexing and backend decoding/i)
    ).toBeVisible();
  });

  it("preserves every draft field when publication fails and never starts a wallet step", async () => {
    const user = userEvent.setup();
    renderAuthoring();
    await fillDraft(user, 1002);
    await user.click(screen.getByRole("button", { name: "Review proposal" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: /I reviewed the exact immutable content/i,
      })
    );
    await user.click(
      screen.getByRole("button", { name: "Publish proposal content" })
    );

    expect(
      await screen.findByText("Proposal content was not published")
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create onchain proposal" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit proposal" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Exact proposal title"
    );
    expect(screen.getByRole("textbox", { name: "Summary" })).toHaveValue(
      "Exact summary"
    );
    expect(
      screen.getByRole("textbox", { name: "Specification" })
    ).toHaveValue(
      "Exact specification"
    );
    expect(
      screen.getByRole("textbox", { name: "Forum discussion" })
    ).toHaveValue(
      "https://gov.yearn.fi/t/improve-treasury-reporting/1002"
    );
  });

  it.each([
    [1003, "Wallet request cancelled"],
    [1004, "Proposal creation failed"],
  ])("keeps published content after proposal failure %s", async (topicId, title) => {
    const user = userEvent.setup();
    renderAuthoring();
    await fillDraft(user, topicId);
    await user.click(screen.getByRole("button", { name: "Review proposal" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: /I reviewed the exact immutable content/i,
      })
    );
    await user.click(
      screen.getByRole("button", { name: "Publish proposal content" })
    );
    await screen.findByText("Proposal content published");
    await user.click(
      screen.getByRole("button", { name: "Create onchain proposal" })
    );

    expect(await screen.findByText(title)).toBeVisible();
    expect(screen.getByText("Proposal content published")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Retry proposal creation" })
    ).toBeEnabled();
  });
});

describe("DAO proposal eligibility presentation", () => {
  it.each([
    ["wrong network", { correctChain: false }, "Switch to the proposal network to continue."],
    ["blacklist", { blacklisted: true }, "This account is blocked from creating proposals."],
    ["weight", { currentWeight: 0n }, "Proposal weight is below the current minimum."],
    ["cooldown", { lastProposedAt: NOW }, "The proposal cooldown is still active."],
  ] as const)("shows the primary %s blocker with all current facts", (_name, patch, reason) => {
    const proposer = proposerState(patch);
    render(<DaoProposalEligibility proposer={proposer} />);

    expect(screen.getByText(reason)).toBeVisible();
    expect(screen.getByText("Current weight")).toBeVisible();
    expect(screen.getByText("Minimum weight")).toBeVisible();
    expect(screen.getByText("Expected voting epoch")).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(7);
  });

  it("names full reward capacity as a shared system rule, not a user quota", () => {
    const base = proposerInput();
    const affectedBoostEpochs = base.affectedBoostEpochs.map((epoch, index) => ({
      ...epoch,
      currentProposalCount: index === 2 ? epoch.proposalLimit : epoch.currentProposalCount,
    }));
    render(
      <DaoProposalEligibility
        proposer={deriveDaoProposerState({ ...base, affectedBoostEpochs })}
      />
    );

    expect(
      screen.getByText(/Proposal capacity is full\. Reward epoch 203/i)
    ).toHaveTextContent("system-wide capacity, not a per-user quota");
    expect(screen.getByText("64 / 64")).toBeVisible();
  });
});

function renderAuthoring() {
  const proposer = deriveDaoProposerState(proposerInput());
  return render(
    <DaoProposalAuthoringForm
      address={proposer.address}
      now={NOW}
      proposer={proposer}
      serviceLatencyMs={0}
    />
  );
}

async function fillDraft(
  user: ReturnType<typeof userEvent.setup>,
  topicId: number
) {
  await user.type(
    screen.getByRole("textbox", { name: "Forum discussion" }),
    `https://gov.yearn.fi/t/topic/${topicId}`
  );
  await user.click(screen.getByRole("button", { name: "Validate topic" }));
  await screen.findByText("Forum topic accepted");
  await user.type(
    screen.getByRole("textbox", { name: "Title" }),
    "Exact proposal title"
  );
  await user.type(
    screen.getByRole("textbox", { name: "Summary" }),
    "Exact summary"
  );
  await user.type(
    screen.getByRole("textbox", { name: "Specification" }),
    "Exact specification"
  );
}

function proposerInput(): DaoProposerEligibilityInput {
  return structuredClone(getDaoMockFixture("discussion").proposer);
}

function proposerState(patch: Partial<DaoProposerEligibilityInput>) {
  return deriveDaoProposerState({ ...proposerInput(), ...patch });
}
