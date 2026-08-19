export const daoProposeCopy = {
  page: {
    title: "Create proposal",
    description:
      "Check eligibility, prepare the immutable content, then create the proposal onchain.",
  },
  landing: {
    title: "Prepare a proposal",
    description:
      "Check your proposal eligibility, then prepare the forum topic and immutable proposal snapshot.",
    eligibleTitle: "Your wallet can create a proposal",
    eligibleFacts: "Current proposal requirements are met.",
    eligibleBody:
      "Start with a public discussion in the Proposals category, then review the exact content before publication.",
    blockedTitle: "Your wallet cannot create a proposal",
    blockedFallback:
      "The connected wallet does not meet the current proposal requirements.",
    eligibleLabel: "Eligible",
    unavailableLabel: "Unavailable",
    start: "Start proposal",
    draft: "Draft proposal",
  },
  form: {
    eyebrow: "Proposal authoring",
    title: "Proposal details",
    description:
      "Complete each section on this page. Your draft stays in place if validation, publication, or proposal creation fails.",
    review: "Review proposal",
    edit: "Edit proposal",
    validationTitle: "Review the highlighted fields",
  },
  discussion: {
    step: "1",
    title: "Forum discussion",
    description:
      "Link a public topic from the Yearn forum Proposals category. The forum can continue to change after submission.",
    label: "Forum discussion",
    placeholder: "https://gov.yearn.fi/t/proposal-topic/1001",
    validate: "Validate topic",
    validating: "Validating topic",
    accepted: "Forum topic accepted",
    topicTitle: "Topic title",
    normalizedUrl: "Normalized topic",
    category: "Category",
    author: "Topic author",
    created: "Topic created",
    newTab: "opens in a new tab",
    required: "Validate a supported Yearn forum topic before review.",
  },
  content: {
    step: "2",
    title: "Immutable proposal content",
    description:
      "Title, summary, specification, forum URL, and proposal type become the immutable proposal snapshot.",
    titleLabel: "Title",
    titlePlaceholder: "A concise proposal title",
    summaryLabel: "Summary",
    summaryPlaceholder: "State the decision and its intended outcome.",
    specificationLabel: "Specification",
    specificationPlaceholder:
      "Describe the complete proposal, constraints, and implementation details.",
    titleRequired: "Enter a proposal title.",
    titleTooLong: (limit: number) =>
      `Keep the proposal title to ${limit} characters or fewer.`,
    summaryRequired: "Enter a proposal summary.",
    summaryTooLong: (limit: number) =>
      `Keep the proposal summary to ${limit} characters or fewer.`,
    specificationRequired: "Enter a proposal specification.",
    specificationTooLong: (limit: number) =>
      `Keep the proposal specification to ${limit} characters or fewer.`,
  },
  type: {
    step: "3",
    title: "Proposal type",
    description: "Choose the onchain effect of this proposal.",
    signal: "Signal",
    signalDescription: "Records a DAO decision without executable calls.",
    executable: "Executable",
    executableDescription:
      "Includes an onchain script prepared with development tools.",
  },
  script: {
    step: "4",
    title: "Execution script",
    description:
      "Paste the full 0x-prefixed Executor script. The browser checks framing and contract limits only.",
    label: "Full Executor script",
    placeholder: "0x...",
    valid: "Script structure is valid",
    emptyTitle: "No executable actions",
    emptyBody: "Signal proposals use the empty Executor script.",
    errorCode: "Error code",
    byteOffset: "Byte offset",
    scriptHash: "Script hash",
    scriptBytes: "Script bytes",
    callCount: "Call count",
    calls: "Parsed calls",
    call: (index: number) => `Call ${index + 1}`,
    target: "Target",
    calldataBytes: "Calldata bytes",
    backendAnalysis:
      "Backend decoding and simulation follow submission on the proposal page.",
  },
  eligibility: {
    step: "5",
    title: "Proposal eligibility",
    description:
      "Eligibility comes from current wallet, network, blacklist, weight, cooldown, and shared-capacity facts.",
    connected: "Wallet",
    connectedValue: "Connected",
    disconnectedValue: "Disconnected",
    network: "Network",
    correctNetwork: "Proposal network",
    wrongNetwork: "Wrong network",
    blacklist: "Blacklist",
    clear: "Clear",
    blocked: "Blocked",
    currentWeight: "Current weight",
    minimumWeight: "Minimum weight",
    cooldown: "Cooldown",
    cooldownReady: "Eligible now",
    nextEligible: "Next eligible",
    votingEpoch: "Expected voting epoch",
    affectedEpochs: "Affected reward epochs",
    epochRange: (first: string, last: string) => `${first}–${last}`,
    capacityFullTitle: (epoch: string) =>
      `Proposal capacity is full in reward epoch ${epoch}.`,
    capacityCount: (count: number, limit: number) =>
      `${count} / ${limit} proposals`,
    capacityFullBody: (first: string, last: string) =>
      `This proposal would affect reward epochs ${first}–${last}. The 64-proposal limit is shared system-wide; it is not a per-user quota.`,
  },
  review: {
    eyebrow: "Final review",
    title: "Review the exact proposal",
    description:
      "Publication fixes this content. Confirm every field and the exact script before continuing.",
    forum: "Forum topic",
    immutableContent: "Immutable content",
    schema: "Schema",
    creator: "Created by",
    createdAt: "Snapshot time",
    proposalType: "Proposal type",
    titleLabel: "Title",
    summary: "Summary",
    specification: "Specification",
    exactScript: "Exact script",
    confirm:
      "I reviewed the exact immutable content, proposal type, script, and script hash.",
    confirmRequired: "Confirm the exact review before publication.",
    submissionSteps: "Submission steps",
    submissionStepsBody:
      "Two actions are required: publish the immutable content, then create the onchain proposal.",
    current: "Current",
    upcoming: "Upcoming",
    complete: "Complete",
    publishStep: "Publish immutable content",
    publishStepBody:
      "Publishing fixes the reviewed snapshot. It does not create the proposal or open your wallet.",
    proposeStep: "Create onchain proposal",
    proposeStepUpcoming:
      "This action becomes available only after the immutable content is published.",
    proposeStepCurrent: "Content published — proposal not created yet",
    proposeStepBody:
      "Create the onchain proposal with the published content fingerprint. A wallet cancellation or revert does not require republishing.",
    indexStatus: "Awaiting proposal indexing and analysis",
  },
  publication: {
    publish: "Publish immutable content",
    retry: "Retry content publication",
    publishing: "Publishing immutable content",
    successTitle: "Immutable content published",
    successBody:
      "Step 1 is complete. The reviewed snapshot is fixed and ready for proposal creation.",
    fingerprint: "Content fingerprint",
    failedTitle: "Proposal content was not published",
  },
  proposal: {
    create: "Create onchain proposal",
    retry: "Retry proposal creation",
    waiting: "Waiting for wallet",
    submittedTitle: "Proposal transaction submitted",
    submittedBody:
      "Waiting for proposal indexing and backend decoding and simulation.",
    transaction: "Transaction hash",
    rejectedTitle: "Wallet request cancelled",
    revertedTitle: "Proposal creation failed",
  },
} as const;
