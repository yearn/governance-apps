import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    const submissionSteps = screen.getByRole("region", {
      name: "Submission steps",
    });
    expect(within(submissionSteps).getByText("Current")).toBeVisible();
    expect(within(submissionSteps).getByText("Upcoming")).toBeVisible();
    expect(
      within(submissionSteps).getByText(/Two actions are required/i)
    ).toBeVisible();
    expect(
      within(submissionSteps).getByText(
        /does not create the proposal or open your wallet/i
      )
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create onchain proposal" })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Publish immutable content" })
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
      screen.getByRole("button", { name: "Publish immutable content" })
    );

    expect(await screen.findByText("Immutable content published")).toBeVisible();
    const proposalStep = await screen.findByRole("heading", {
      name: "Content published — proposal not created yet",
    });
    expect(proposalStep).toHaveFocus();
    const proposalStepRegion = proposalStep.closest("section");
    expect(proposalStepRegion).not.toBeNull();
    expect(
      within(proposalStepRegion!).getByText(/does not require republishing/i)
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Create onchain proposal" })
    );
    const completionHeading = await screen.findByRole("heading", {
      name: "Proposal transaction submitted",
    });
    expect(completionHeading).toBeVisible();
    expect(completionHeading).toHaveFocus();
    expect(
      screen.getByText("Awaiting proposal indexing and analysis")
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Awaiting proposal indexing and analysis."
    );
  });

  it("locks the exact review throughout publication and exposes complete forum facts", async () => {
    const user = userEvent.setup();
    const exactTitle = "  Exact   proposal title  ";
    renderAuthoring(80);
    await fillDraft(user, 1001, exactTitle);

    const acceptedTopic = screen.getByRole("status", {
      name: "",
    });
    expect(within(acceptedTopic).getByText("Fund protocol research")).toBeVisible();
    expect(within(acceptedTopic).getByText("Proposals · ID 5")).toBeVisible();
    expect(within(acceptedTopic).getByText("yearn-contributor")).toBeVisible();
    expect(within(acceptedTopic).getByText("Aug 1, 2024, 12:00 AM UTC")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Review proposal" }));

    const immutable = screen.getByRole("region", { name: "Immutable content" });
    const exactTitleValue = within(immutable).getByText(exactTitle, {
      exact: true,
      normalizer: (value) => value,
    });
    expect(exactTitleValue).toHaveClass("whitespace-pre-wrap");

    const forum = screen.getByRole("region", { name: "Forum topic" });
    expect(within(forum).getByText("Fund protocol research")).toBeVisible();
    expect(within(forum).getByText("Proposals · ID 5")).toBeVisible();
    expect(within(forum).getByText("yearn-contributor")).toBeVisible();
    expect(within(forum).getByText("Aug 1, 2024, 12:00 AM UTC")).toBeVisible();
    expect(
      within(forum).getByRole("link", { name: /opens in a new tab/i })
    ).toHaveAttribute("target", "_blank");

    await user.click(
      screen.getByRole("checkbox", {
        name: /I reviewed the exact immutable content/i,
      })
    );
    await user.click(
      screen.getByRole("button", { name: "Publish immutable content" })
    );

    expect(
      screen.getByRole("button", { name: "Publishing immutable content" })
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "Publishing immutable content"
    );
    const edit = screen.getByRole("button", { name: "Edit proposal" });
    expect(edit).toBeDisabled();

    edit.removeAttribute("disabled");
    fireEvent.click(edit);
    expect(
      screen.getByRole("heading", { name: "Review the exact proposal" })
    ).toBeVisible();

    expect(await screen.findByText("Immutable content published")).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit proposal" })).toBeDisabled();
    expect(exactTitleValue.textContent).toBe(exactTitle);
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
      screen.getByRole("button", { name: "Publish immutable content" })
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
      screen.getByRole("button", { name: "Publish immutable content" })
    );
    await screen.findByText("Immutable content published");
    await user.click(
      screen.getByRole("button", { name: "Create onchain proposal" })
    );

    expect(await screen.findByText(title)).toBeVisible();
    expect(screen.getByText("Immutable content published")).toBeVisible();
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
    expect(screen.getByText("Affected reward epochs")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/capacity has room/i)
    ).not.toBeInTheDocument();
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
      screen.getByText("Proposal capacity is full in reward epoch 203.")
    ).toBeVisible();
    expect(
      screen.getByText(/shared system-wide; it is not a per-user quota/i)
    ).toHaveTextContent("reward epochs 201–206");
    expect(screen.getByText("64 / 64 proposals")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the authoritative disconnected fact and keeps wallet priority", () => {
    const base = proposerInput();
    const proposer = deriveDaoProposerState({
      ...base,
      connected: false,
      correctChain: false,
      blacklisted: true,
      currentWeight: 0n,
      lastProposedAt: NOW,
      affectedBoostEpochs: base.affectedBoostEpochs.map((epoch, index) => ({
        ...epoch,
        currentProposalCount: index === 0 ? epoch.proposalLimit : 0,
      })),
    });

    render(<DaoProposalEligibility proposer={proposer} />);

    expect(screen.getByText("Connect a wallet to continue.")).toBeVisible();
    expect(screen.getByText("Disconnected")).toBeVisible();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  });
});

function renderAuthoring(serviceLatencyMs = 0) {
  const proposer = deriveDaoProposerState(proposerInput());
  return render(
    <DaoProposalAuthoringForm
      address={proposer.address}
      now={NOW}
      proposer={proposer}
      serviceLatencyMs={serviceLatencyMs}
    />
  );
}

async function fillDraft(
  user: ReturnType<typeof userEvent.setup>,
  topicId: number,
  title = "Exact proposal title"
) {
  await user.type(
    screen.getByRole("textbox", { name: "Forum discussion" }),
    `https://gov.yearn.fi/t/topic/${topicId}`
  );
  await user.click(screen.getByRole("button", { name: "Validate topic" }));
  await screen.findByText("Forum topic accepted");
  await user.type(
    screen.getByRole("textbox", { name: "Title" }),
    title
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
