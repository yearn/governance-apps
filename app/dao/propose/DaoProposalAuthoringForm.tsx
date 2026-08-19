"use client";

import {
  forwardRef,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UtcTime } from "@/components/ui/UtcTime";
import {
  checkDaoExecutorScript,
  type DaoMockAuthoring,
  type DaoProposalType,
  type DaoProposerState,
  type DaoScriptCheck,
} from "@/lib/clients/dao";
import { cn } from "@/lib/cn";
import { formatTokenAmount } from "@/lib/format";
import {
  createDaoAuthoringReview,
  DAO_AUTHORING_LIMITS,
  findFirstFullDaoCapacityEpoch,
  type DaoAuthoringErrors,
} from "./authoring";
import {
  publishMockDaoProposalContent,
  submitMockDaoProposal,
  validateMockDaoForumTopic,
  type DaoAuthoringReview,
  type DaoForumTopic,
  type DaoPublishedContent,
} from "./mock-services";
import { daoProposeCopy } from "./messages";

const FIELD_CLASS_NAME =
  "w-full rounded-box border border-border bg-surface px-3 text-base text-text-primary shadow-sm transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-text-secondary focus:border-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 focus:ring-offset-app motion-reduce:transition-none";
const INPUT_CLASS_NAME = `${FIELD_CLASS_NAME} h-12`;
const TEXTAREA_CLASS_NAME = `${FIELD_CLASS_NAME} min-h-32 py-3`;

type ForumState =
  | { state: "idle" }
  | { state: "validating" }
  | { state: "valid"; topic: DaoForumTopic }
  | { state: "invalid"; code: string; message: string };

type PublicationState =
  | { state: "idle" }
  | { state: "publishing" }
  | { state: "failed"; message: string }
  | { state: "published"; publication: DaoPublishedContent };

type WalletState =
  | { state: "idle" }
  | { state: "waiting" }
  | {
      state: "failed";
      code: "WALLET_REJECTED" | "PROPOSAL_REVERTED";
      message: string;
    }
  | { state: "submitted"; transactionHash: `0x${string}` };

type DaoProposalAuthoringFormProps = {
  address: Address;
  authoringPreset?: DaoMockAuthoring | null;
  now: number;
  proposer: DaoProposerState;
  serviceLatencyMs?: number;
};

export function DaoProposalAuthoringForm(
  props: DaoProposalAuthoringFormProps
) {
  const presetKey = props.authoringPreset
    ? props.authoringPreset.state
    : "default";
  return <DaoProposalAuthoringFormState key={presetKey} {...props} />;
}

function DaoProposalAuthoringFormState({
  address,
  authoringPreset,
  now,
  proposer,
  serviceLatencyMs = 140,
}: DaoProposalAuthoringFormProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [specification, setSpecification] = useState("");
  const [proposalType, setProposalType] = useState<DaoProposalType>(
    authoringPreset?.proposalType ?? "signal"
  );
  const [executableScript, setExecutableScript] = useState(
    authoringPreset?.proposalType === "executable"
      ? authoringPreset.scriptCheck.script
      : "0x"
  );
  const [forumInput, setForumInput] = useState("");
  const [forumState, setForumState] = useState<ForumState>({ state: "idle" });
  const [errors, setErrors] = useState<DaoAuthoringErrors>({});
  const [review, setReview] = useState<DaoAuthoringReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [publication, setPublication] = useState<PublicationState>({ state: "idle" });
  const [wallet, setWallet] = useState<WalletState>({ state: "idle" });
  const forumRequest = useRef(0);
  const publicationLock = useRef(false);
  const forumInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const specificationRef = useRef<HTMLTextAreaElement>(null);
  const scriptRef = useRef<HTMLTextAreaElement>(null);

  const exactScript = proposalType === "signal" ? "0x" : executableScript;
  const scriptCheck = checkDaoExecutorScript(exactScript, proposalType);
  const topic = forumState.state === "valid" ? forumState.topic : null;

  const handleForumInput = (value: string) => {
    forumRequest.current += 1;
    setForumInput(value);
    setForumState({ state: "idle" });
    setErrors((current) => ({ ...current, forum: undefined }));
  };

  const handleForumValidation = async () => {
    const request = forumRequest.current + 1;
    forumRequest.current = request;
    setForumState({ state: "validating" });
    const result = await validateMockDaoForumTopic(
      forumInput,
      serviceLatencyMs
    );
    if (request !== forumRequest.current) return;
    if (result.state === "invalid") {
      setForumState({
        state: "invalid",
        code: result.error.code,
        message: result.error.message,
      });
      return;
    }
    setForumInput(result.topic.normalizedUrl);
    setForumState({ state: "valid", topic: result.topic });
    setErrors((current) => ({ ...current, forum: undefined }));
  };

  const handleReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createDaoAuthoringReview({
      address,
      createdAt: now,
      draft: {
        title,
        summary,
        specification,
        proposalType,
        executableScript,
      },
      topic,
    });

    if (result.state === "invalid") {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }

    setErrors({});
    setReview(result.review);
    setConfirmed(false);
    setConfirmationError(null);
    setPublication({ state: "idle" });
    setWallet({ state: "idle" });
    requestAnimationFrame(() => {
      document.getElementById("dao-proposal-final-review")?.focus();
    });
  };

  const focusFirstError = (nextErrors: DaoAuthoringErrors) => {
    const refs = {
      forum: forumInputRef,
      title: titleRef,
      summary: summaryRef,
      specification: specificationRef,
      script: scriptRef,
    } as const;
    const first = (Object.keys(nextErrors) as (keyof DaoAuthoringErrors)[])[0];
    requestAnimationFrame(() => refs[first]?.current?.focus());
  };

  const handleEdit = () => {
    if (
      publicationLock.current ||
      publication.state === "publishing" ||
      publication.state === "published"
    ) {
      return;
    }
    setReview(null);
    setConfirmed(false);
    setConfirmationError(null);
    setPublication({ state: "idle" });
    setWallet({ state: "idle" });
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const handlePublish = async () => {
    if (!review || publicationLock.current) return;
    if (!confirmed) {
      setConfirmationError(daoProposeCopy.review.confirmRequired);
      return;
    }
    if (!proposer.canPropose) return;

    setConfirmationError(null);
    publicationLock.current = true;
    setPublication({ state: "publishing" });
    setWallet({ state: "idle" });
    const result = await publishMockDaoProposalContent(
      review,
      now,
      serviceLatencyMs
    );
    if (result.state === "failed") {
      publicationLock.current = false;
      setPublication({ state: "failed", message: result.error.message });
      return;
    }
    setPublication({ state: "published", publication: result.publication });
  };

  const handleCreateProposal = async () => {
    if (
      !review ||
      publication.state !== "published" ||
      wallet.state === "waiting" ||
      !proposer.canPropose
    ) {
      return;
    }

    setWallet({ state: "waiting" });
    const result = await submitMockDaoProposal(
      review,
      publication.publication,
      serviceLatencyMs
    );
    if (result.state === "failed") {
      setWallet({
        state: "failed",
        code: result.error.code,
        message: result.error.message,
      });
      return;
    }
    setWallet({
      state: "submitted",
      transactionHash: result.transactionHash,
    });
  };

  if (review) {
    return (
      <DaoFinalReview
        confirmed={confirmed}
        confirmationError={confirmationError}
        onConfirm={(value) => {
          setConfirmed(value);
          if (value) setConfirmationError(null);
        }}
        onCreateProposal={handleCreateProposal}
        onEdit={handleEdit}
        onPublish={handlePublish}
        proposer={proposer}
        publication={publication}
        review={review}
        wallet={wallet}
      />
    );
  }

  return (
    <Card className="min-w-0 space-y-8 overflow-hidden p-4 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-yearn-blue">
          {daoProposeCopy.form.eyebrow}
        </p>
        <h2
          id="dao-proposal-authoring-heading"
          tabIndex={-1}
          className="w-fit max-w-full scroll-mt-24 rounded-box text-balance text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app md:text-3xl"
        >
          {daoProposeCopy.form.title}
        </h2>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
          {daoProposeCopy.form.description}
        </p>
      </div>

      {Object.keys(errors).length > 0 ? (
        <div
          role="alert"
          className="rounded-box border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-bold">{daoProposeCopy.form.validationTitle}</p>
        </div>
      ) : null}

      <form noValidate className="space-y-8" onSubmit={handleReview}>
        <AuthoringSection
          number={daoProposeCopy.discussion.step}
          title={daoProposeCopy.discussion.title}
          description={daoProposeCopy.discussion.description}
        >
          <div className="space-y-2">
            <label htmlFor="dao-forum-topic" className="block text-sm font-bold">
              {daoProposeCopy.discussion.label}
            </label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                ref={forumInputRef}
                id="dao-forum-topic"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={forumInput}
                placeholder={daoProposeCopy.discussion.placeholder}
                aria-invalid={Boolean(errors.forum || forumState.state === "invalid")}
                aria-describedby="dao-forum-help dao-forum-status"
                className={INPUT_CLASS_NAME}
                onChange={(event) => handleForumInput(event.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                isLoading={forumState.state === "validating"}
                className="h-12 w-full motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
                onClick={() => {
                  void handleForumValidation();
                }}
              >
                {forumState.state === "validating"
                  ? daoProposeCopy.discussion.validating
                  : daoProposeCopy.discussion.validate}
              </Button>
            </div>
            <p id="dao-forum-help" className="text-pretty text-xs leading-5 text-text-secondary">
              {daoProposeCopy.discussion.placeholder}
            </p>
            <ForumStatus state={forumState} error={errors.forum} />
          </div>
        </AuthoringSection>

        <AuthoringSection
          number={daoProposeCopy.content.step}
          title={daoProposeCopy.content.title}
          description={daoProposeCopy.content.description}
        >
          <TextField
            ref={titleRef}
            id="dao-proposal-title"
            label={daoProposeCopy.content.titleLabel}
            value={title}
            error={errors.title}
            maxLength={DAO_AUTHORING_LIMITS.title}
            placeholder={daoProposeCopy.content.titlePlaceholder}
            onChange={setTitle}
          />
          <TextAreaField
            ref={summaryRef}
            id="dao-proposal-summary"
            label={daoProposeCopy.content.summaryLabel}
            value={summary}
            error={errors.summary}
            maxLength={DAO_AUTHORING_LIMITS.summary}
            placeholder={daoProposeCopy.content.summaryPlaceholder}
            rows={5}
            onChange={setSummary}
          />
          <TextAreaField
            ref={specificationRef}
            id="dao-proposal-specification"
            label={daoProposeCopy.content.specificationLabel}
            value={specification}
            error={errors.specification}
            maxLength={DAO_AUTHORING_LIMITS.specification}
            placeholder={daoProposeCopy.content.specificationPlaceholder}
            rows={9}
            onChange={setSpecification}
          />
        </AuthoringSection>

        <AuthoringSection
          number={daoProposeCopy.type.step}
          title={daoProposeCopy.type.title}
          description={daoProposeCopy.type.description}
        >
          <fieldset>
            <legend className="sr-only">{daoProposeCopy.type.title}</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <ProposalTypeChoice
                checked={proposalType === "signal"}
                description={daoProposeCopy.type.signalDescription}
                label={daoProposeCopy.type.signal}
                value="signal"
                onChange={setProposalType}
              />
              <ProposalTypeChoice
                checked={proposalType === "executable"}
                description={daoProposeCopy.type.executableDescription}
                label={daoProposeCopy.type.executable}
                value="executable"
                onChange={setProposalType}
              />
            </div>
          </fieldset>
        </AuthoringSection>

        <AuthoringSection
          number={daoProposeCopy.script.step}
          title={daoProposeCopy.script.title}
          description={
            proposalType === "signal"
              ? daoProposeCopy.script.emptyBody
              : daoProposeCopy.script.description
          }
        >
          {proposalType === "signal" ? (
            <SignalScriptSummary scriptCheck={scriptCheck} />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="dao-executor-script" className="block text-sm font-bold">
                  {daoProposeCopy.script.label}
                </label>
                <textarea
                  ref={scriptRef}
                  id="dao-executor-script"
                  rows={10}
                  value={executableScript}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder={daoProposeCopy.script.placeholder}
                  aria-invalid={scriptCheck.state === "invalid" || Boolean(errors.script)}
                  aria-describedby="dao-script-help dao-script-status"
                  className={cn(TEXTAREA_CLASS_NAME, "font-number text-sm leading-6")}
                  onChange={(event) => {
                    setExecutableScript(event.target.value);
                    setErrors((current) => ({ ...current, script: undefined }));
                  }}
                />
              </div>
              <p id="dao-script-help" className="text-pretty text-xs leading-5 text-text-secondary">
                {daoProposeCopy.script.backendAnalysis}
              </p>
              <ScriptStatus scriptCheck={scriptCheck} />
            </div>
          )}
        </AuthoringSection>

        <AuthoringSection
          number={daoProposeCopy.eligibility.step}
          title={daoProposeCopy.eligibility.title}
          description={daoProposeCopy.eligibility.description}
        >
          <DaoProposalEligibility proposer={proposer} />
        </AuthoringSection>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
            {daoProposeCopy.script.backendAnalysis}
          </p>
          <Button
            type="submit"
            className="w-full shrink-0 motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
          >
            {daoProposeCopy.form.review}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DaoFinalReview({
  confirmed,
  confirmationError,
  onConfirm,
  onCreateProposal,
  onEdit,
  onPublish,
  proposer,
  publication,
  review,
  wallet,
}: {
  confirmed: boolean;
  confirmationError: string | null;
  onConfirm: (value: boolean) => void;
  onCreateProposal: () => Promise<void>;
  onEdit: () => void;
  onPublish: () => Promise<void>;
  proposer: DaoProposerState;
  publication: PublicationState;
  review: DaoAuthoringReview;
  wallet: WalletState;
}) {
  const publicationLocked =
    publication.state === "publishing" || publication.state === "published";
  const contentPublished = publication.state === "published";
  const walletFinished = wallet.state === "submitted";

  return (
    <Card className="min-w-0 space-y-8 overflow-hidden p-4 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-yearn-blue">
          {daoProposeCopy.review.eyebrow}
        </p>
        <h2
          id="dao-proposal-final-review"
          tabIndex={-1}
          className="text-balance text-2xl font-bold outline-none md:text-3xl"
        >
          {daoProposeCopy.review.title}
        </h2>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
          {daoProposeCopy.review.description}
        </p>
      </div>

      <ReviewSection title={daoProposeCopy.review.forum}>
        <ReviewFact label={daoProposeCopy.discussion.topicTitle}>
          {review.topic.title}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.discussion.normalizedUrl}>
          <a
            href={review.topic.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${review.topic.normalizedUrl} (${daoProposeCopy.discussion.newTab})`}
            className="-mx-1 inline-flex min-h-10 max-w-full items-center rounded-box px-1 text-yearn-blue underline decoration-yearn-blue/40 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-text-primary"
          >
            <span className="break-all">{review.topic.normalizedUrl}</span>
          </a>
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.discussion.category}>
          {review.topic.category} · ID {review.topic.categoryId}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.discussion.author}>
          {review.topic.author}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.discussion.created} mono>
          <UtcTime timestamp={review.topic.createdAt} />
        </ReviewFact>
      </ReviewSection>

      <ReviewSection title={daoProposeCopy.review.immutableContent}>
        <ReviewFact label={daoProposeCopy.review.schema} mono>
          {review.content.schema}
        </ReviewFact>
        <ReviewFact
          label={daoProposeCopy.review.titleLabel}
          preserveWhitespace
        >
          {review.content.title}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.review.summary} preserveWhitespace>
          {review.content.summary}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.review.specification} preserveWhitespace>
          {review.content.specification}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.review.creator} mono>
          {review.content.createdBy}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.review.createdAt} mono>
          {review.content.createdAt}
        </ReviewFact>
        <ReviewFact label={daoProposeCopy.review.proposalType}>
          {review.content.proposalType === "signal"
            ? daoProposeCopy.type.signal
            : daoProposeCopy.type.executable}
        </ReviewFact>
      </ReviewSection>

      <ReviewSection title={daoProposeCopy.review.exactScript}>
        {review.content.proposalType === "signal" ? (
          <p className="text-pretty text-sm font-bold">
            {daoProposeCopy.script.emptyTitle}
          </p>
        ) : (
          <p className="text-pretty text-sm font-bold text-green-800">
            {daoProposeCopy.script.valid}
          </p>
        )}
        <CodeValue>{review.scriptCheck.script}</CodeValue>
        <ReviewFact label={daoProposeCopy.script.scriptHash} mono>
          {review.scriptCheck.scriptHash ?? "--"}
        </ReviewFact>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            label={daoProposeCopy.script.callCount}
            value={review.scriptCheck.frames.length.toString()}
          />
          <Metric
            label={daoProposeCopy.script.scriptBytes}
            value={(review.scriptCheck.scriptBytes ?? 0).toString()}
          />
        </div>
        {review.scriptCheck.frames.length > 0 ? (
          <ScriptFrames scriptCheck={review.scriptCheck} />
        ) : null}
        <p className="text-pretty text-sm leading-6 text-text-secondary">
          {daoProposeCopy.script.backendAnalysis}
        </p>
      </ReviewSection>

      <ReviewSection title={daoProposeCopy.eligibility.title}>
        <DaoProposalEligibility proposer={proposer} />
      </ReviewSection>

      <ReviewSection title={daoProposeCopy.review.submissionSteps}>
        <ol className="space-y-3 text-sm">
          <SubmissionStep
            number="1"
            label={daoProposeCopy.review.publishStep}
            complete={publication.state === "published"}
          />
          <SubmissionStep
            number="2"
            label={daoProposeCopy.review.proposeStep}
            complete={wallet.state === "submitted"}
          />
          <SubmissionStep
            number="3"
            label={daoProposeCopy.review.indexStep}
            complete={false}
          />
        </ol>
      </ReviewSection>

      {!contentPublished ? (
        <div className="space-y-4 border-t border-border pt-6">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-box bg-surface-secondary p-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={confirmed}
              aria-describedby={confirmationError ? "dao-confirmation-error" : undefined}
              className="mt-1 size-5 shrink-0 accent-yearn-blue focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2"
              onChange={(event) => onConfirm(event.target.checked)}
            />
            <span>{daoProposeCopy.review.confirm}</span>
          </label>
          {confirmationError ? (
            <p id="dao-confirmation-error" role="alert" className="text-sm text-red-800">
              {confirmationError}
            </p>
          ) : null}
          {publication.state === "failed" ? (
            <StateNotice
              tone="error"
              title={daoProposeCopy.publication.failedTitle}
              body={publication.message}
            />
          ) : null}
          {!proposer.canPropose ? (
            <StateNotice
              tone="warning"
              title={daoProposeCopy.landing.blockedTitle}
              body={
                proposer.proposeBlockedReason ??
                daoProposeCopy.landing.blockedFallback
              }
            />
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={publicationLocked}
              className="w-full motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
              onClick={onEdit}
            >
              {daoProposeCopy.form.edit}
            </Button>
            <Button
              type="button"
              disabled={!proposer.canPropose}
              isLoading={publication.state === "publishing"}
              className="w-full motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
              onClick={() => {
                void onPublish();
              }}
            >
              {publication.state === "failed"
                ? daoProposeCopy.publication.retry
                : publication.state === "publishing"
                  ? daoProposeCopy.publication.publishing
                  : daoProposeCopy.publication.publish}
            </Button>
          </div>
          {publication.state === "publishing" ? (
            <p role="status" aria-live="polite" className="sr-only">
              {daoProposeCopy.publication.publishing}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5 border-t border-border pt-6">
          <StateNotice
            tone="success"
            title={daoProposeCopy.publication.successTitle}
            body={daoProposeCopy.publication.successBody}
          />
          <ReviewFact label={daoProposeCopy.publication.fingerprint} mono>
            {publication.publication.fingerprint}
          </ReviewFact>

          {wallet.state === "failed" ? (
            <StateNotice
              tone="error"
              title={
                wallet.code === "WALLET_REJECTED"
                  ? daoProposeCopy.proposal.rejectedTitle
                  : daoProposeCopy.proposal.revertedTitle
              }
              body={wallet.message}
            />
          ) : null}
          {wallet.state === "submitted" ? (
            <div className="space-y-4">
              <StateNotice
                tone="success"
                title={daoProposeCopy.proposal.submittedTitle}
                body={daoProposeCopy.proposal.submittedBody}
              />
              <ReviewFact label={daoProposeCopy.proposal.transaction} mono>
                {wallet.transactionHash}
              </ReviewFact>
            </div>
          ) : null}
          {!walletFinished ? (
            <div className="space-y-3">
              {!proposer.canPropose ? (
                <StateNotice
                  tone="warning"
                  title={daoProposeCopy.landing.blockedTitle}
                  body={
                    proposer.proposeBlockedReason ??
                    daoProposeCopy.landing.blockedFallback
                  }
                />
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled
                  className="w-full motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
                  onClick={onEdit}
                >
                  {daoProposeCopy.form.edit}
                </Button>
                <Button
                  type="button"
                  disabled={!proposer.canPropose}
                  isLoading={wallet.state === "waiting"}
                  className="w-full motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
                  onClick={() => {
                    void onCreateProposal();
                  }}
                >
                  {wallet.state === "failed"
                    ? daoProposeCopy.proposal.retry
                    : wallet.state === "waiting"
                      ? daoProposeCopy.proposal.waiting
                      : daoProposeCopy.proposal.create}
                </Button>
              </div>
              {wallet.state === "waiting" ? (
                <p role="status" aria-live="polite" className="sr-only">
                  {daoProposeCopy.proposal.waiting}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

export function DaoProposalEligibility({
  proposer,
}: {
  proposer: DaoProposerState;
}) {
  const fullEpoch = findFirstFullDaoCapacityEpoch(proposer.affectedBoostEpochs);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={proposer.canPropose ? "success" : "warning"}>
          {proposer.canPropose
            ? daoProposeCopy.landing.eligibleLabel
            : daoProposeCopy.landing.unavailableLabel}
        </Badge>
        <p className="text-pretty text-sm font-bold">
          {proposer.canPropose
            ? daoProposeCopy.landing.eligibleFacts
            : proposer.proposeBlockedReason ??
              daoProposeCopy.landing.blockedFallback}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EligibilityFact
          label={daoProposeCopy.eligibility.connected}
          value={
            proposer.connected
              ? daoProposeCopy.eligibility.connectedValue
              : daoProposeCopy.eligibility.disconnectedValue
          }
        />
        <EligibilityFact
          label={daoProposeCopy.eligibility.network}
          value={
            proposer.correctChain
              ? daoProposeCopy.eligibility.correctNetwork
              : daoProposeCopy.eligibility.wrongNetwork
          }
        />
        <EligibilityFact
          label={daoProposeCopy.eligibility.blacklist}
          value={
            proposer.blacklisted
              ? daoProposeCopy.eligibility.blocked
              : daoProposeCopy.eligibility.clear
          }
        />
        <EligibilityFact
          label={daoProposeCopy.eligibility.currentWeight}
          value={formatTokenAmount(proposer.currentWeight, 18, 2)}
          mono
        />
        <EligibilityFact
          label={daoProposeCopy.eligibility.minimumWeight}
          value={formatTokenAmount(proposer.minimumWeight, 18, 2)}
          mono
        />
        <div className="rounded-box bg-surface-secondary p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            {proposer.nextEligibleAt === 0
              ? daoProposeCopy.eligibility.cooldown
              : daoProposeCopy.eligibility.nextEligible}
          </dt>
          <dd className="mt-1 font-number text-sm tabular-nums">
            {proposer.nextEligibleAt === 0 ? (
              daoProposeCopy.eligibility.cooldownReady
            ) : (
              <UtcTime timestamp={proposer.nextEligibleAt} />
            )}
          </dd>
        </div>
        <EligibilityFact
          label={daoProposeCopy.eligibility.votingEpoch}
          value={proposer.expectedVotingEpoch.toString()}
          mono
        />
      </dl>

      <div className="space-y-3">
        <div
          className={cn(
            "rounded-box border p-3 text-sm leading-6",
            fullEpoch
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-border bg-surface-secondary text-text-secondary"
          )}
        >
          <p className="text-pretty font-bold">
            {fullEpoch
              ? daoProposeCopy.eligibility.capacityFull(fullEpoch.epoch.toString())
              : daoProposeCopy.eligibility.capacityAvailable}
          </p>
          <p className="mt-1 text-pretty">
            {daoProposeCopy.eligibility.sharedRule}
          </p>
        </div>
        <div className="max-w-full overflow-x-auto rounded-box border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-2 font-bold">
                  {daoProposeCopy.eligibility.epoch}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-bold">
                  {daoProposeCopy.eligibility.proposals}
                </th>
              </tr>
            </thead>
            <tbody>
              {proposer.affectedBoostEpochs.map((affected) => (
                <tr key={affected.epoch.toString()} className="border-t border-border">
                  <td className="px-3 py-2 font-number tabular-nums">
                    {affected.epoch.toString()}
                  </td>
                  <td className="px-3 py-2 text-right font-number tabular-nums">
                    {affected.currentProposalCount} / {affected.proposalLimit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuthoringSection({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  number: string;
  title: string;
}) {
  const headingId = `dao-authoring-section-${number}`;
  return (
    <section aria-labelledby={headingId} className="space-y-5 border-t border-border pt-8 first:border-0 first:pt-0">
      <div className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-yearn-blue/10 font-number text-sm font-bold tabular-nums text-yearn-blue"
        >
          {number}
        </span>
        <div className="space-y-1">
          <h3 id={headingId} className="text-balance text-xl font-bold">
            {title}
          </h3>
          <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-5 sm:pl-[3.25rem]">{children}</div>
    </section>
  );
}

function ForumStatus({
  error,
  state,
}: {
  error?: string;
  state: ForumState;
}) {
  if (state.state === "validating") {
    return (
      <p id="dao-forum-status" role="status" className="text-sm text-text-secondary">
        {daoProposeCopy.discussion.validating}
      </p>
    );
  }
  if (state.state === "invalid" || error) {
    return (
      <div id="dao-forum-status" role="alert" className="text-sm text-red-800">
        {state.state === "invalid" ? (
          <p>
            <span className="font-number font-bold">{state.code}</span> · {state.message}
          </p>
        ) : (
          <p>{error}</p>
        )}
      </div>
    );
  }
  if (state.state !== "valid") return <span id="dao-forum-status" />;
  return (
    <div id="dao-forum-status" role="status" className="space-y-3 rounded-box bg-green-50 p-4 text-sm text-green-950">
      <p className="font-bold">{daoProposeCopy.discussion.accepted}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        <ForumFact label={daoProposeCopy.discussion.topicTitle}>
          {state.topic.title}
        </ForumFact>
        <ForumFact label={daoProposeCopy.discussion.normalizedUrl} mono>
          {state.topic.normalizedUrl}
        </ForumFact>
        <ForumFact label={daoProposeCopy.discussion.category}>
          {state.topic.category} · ID {state.topic.categoryId}
        </ForumFact>
        <ForumFact label={daoProposeCopy.discussion.author}>
          {state.topic.author}
        </ForumFact>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-green-800">
            {daoProposeCopy.discussion.created}
          </dt>
          <dd className="mt-1 font-number tabular-nums">
            <UtcTime timestamp={state.topic.createdAt} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ForumFact({
  children,
  label,
  mono = false,
}: {
  children: ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-green-800">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 break-words",
          mono && "break-all font-number tabular-nums"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

type TextFieldProps = {
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    error,
    id,
    label,
    maxLength,
    onChange,
    placeholder,
    value,
  },
  ref
) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold">{label}</label>
        <span id={helpId} className="font-number text-xs tabular-nums text-text-secondary">
          {value.length} / {maxLength}
        </span>
      </div>
      <input
        ref={ref}
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        className={INPUT_CLASS_NAME}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p id={errorId} className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
});

type TextAreaFieldProps = {
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  value: string;
};

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField(
    {
      error,
      id,
      label,
      maxLength,
      onChange,
      placeholder,
      rows,
      value,
    },
    ref
  ) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold">{label}</label>
        <span id={helpId} className="font-number text-xs tabular-nums text-text-secondary">
          {value.length} / {maxLength}
        </span>
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        className={TEXTAREA_CLASS_NAME}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p id={errorId} className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
  }
);

function ProposalTypeChoice({
  checked,
  description,
  label,
  onChange,
  value,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: DaoProposalType) => void;
  value: DaoProposalType;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-24 cursor-pointer items-start gap-3 rounded-box border bg-surface p-4 shadow-sm transition-[background-color,border-color,box-shadow,scale] duration-150 ease-out active:scale-[0.96] focus-within:ring-2 focus-within:ring-text-primary focus-within:ring-offset-2 focus-within:ring-offset-app motion-reduce:transition-none motion-reduce:active:scale-100",
        checked ? "border-yearn-blue bg-yearn-blue/5" : "border-border"
      )}
    >
      <input
        type="radio"
        name="dao-proposal-type"
        value={value}
        checked={checked}
        className="mt-1 size-5 shrink-0 accent-yearn-blue"
        onChange={() => onChange(value)}
      />
      <span className="space-y-1">
        <span className="block font-bold">{label}</span>
        <span className="block text-pretty text-sm leading-6 text-text-secondary">
          {description}
        </span>
      </span>
    </label>
  );
}

function SignalScriptSummary({ scriptCheck }: { scriptCheck: DaoScriptCheck }) {
  return (
    <div className="space-y-3 rounded-box bg-surface-secondary p-4">
      <p className="font-bold">{daoProposeCopy.script.emptyTitle}</p>
      <ReviewFact label={daoProposeCopy.review.exactScript} mono>
        {scriptCheck.script}
      </ReviewFact>
      <ReviewFact label={daoProposeCopy.script.scriptHash} mono>
        {scriptCheck.scriptHash ?? "--"}
      </ReviewFact>
    </div>
  );
}

function ScriptStatus({ scriptCheck }: { scriptCheck: DaoScriptCheck }) {
  if (scriptCheck.state === "invalid") {
    return (
      <div id="dao-script-status" role="alert" className="space-y-2 rounded-box border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-bold">{scriptCheck.error?.message}</p>
        <dl className="grid gap-2 sm:grid-cols-2">
          <ReviewFact label={daoProposeCopy.script.errorCode} mono>
            {scriptCheck.error?.code ?? "--"}
          </ReviewFact>
          <ReviewFact label={daoProposeCopy.script.byteOffset} mono>
            {scriptCheck.error?.offset?.toString() ?? "--"}
          </ReviewFact>
          {scriptCheck.scriptBytes !== null ? (
            <ReviewFact label={daoProposeCopy.script.scriptBytes} mono>
              {scriptCheck.scriptBytes.toString()}
            </ReviewFact>
          ) : null}
          {scriptCheck.scriptHash ? (
            <ReviewFact label={daoProposeCopy.script.scriptHash} mono>
              {scriptCheck.scriptHash}
            </ReviewFact>
          ) : null}
        </dl>
      </div>
    );
  }
  return (
    <div id="dao-script-status" role="status" className="space-y-4 rounded-box bg-green-50 p-4 text-green-950">
      <p className="font-bold">{daoProposeCopy.script.valid}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label={daoProposeCopy.script.callCount} value={scriptCheck.frames.length.toString()} />
        <Metric label={daoProposeCopy.script.scriptBytes} value={(scriptCheck.scriptBytes ?? 0).toString()} />
      </div>
      <ReviewFact label={daoProposeCopy.script.scriptHash} mono>
        {scriptCheck.scriptHash ?? "--"}
      </ReviewFact>
      <ScriptFrames scriptCheck={scriptCheck} />
    </div>
  );
}

function ScriptFrames({ scriptCheck }: { scriptCheck: DaoScriptCheck }) {
  if (scriptCheck.frames.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold">{daoProposeCopy.script.calls}</p>
      <ol className="space-y-2">
        {scriptCheck.frames.map((frame) => (
          <li key={`${frame.index}:${frame.offset}`} className="min-w-0 rounded-box bg-surface p-3 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{daoProposeCopy.script.call(frame.index)}</span>
              <span className="font-number text-xs tabular-nums text-text-secondary">
                byte {frame.offset} · {frame.calldataBytes} calldata bytes
              </span>
            </div>
            <code className="mt-2 block break-all font-number text-xs leading-5">
              {frame.target}
            </code>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section
      aria-label={title}
      className="space-y-4 border-t border-border pt-6 first:border-0 first:pt-0"
    >
      <h3 className="text-balance text-lg font-bold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ReviewFact({
  children,
  label,
  mono = false,
  preserveWhitespace = false,
}: {
  children: ReactNode;
  label: string;
  mono?: boolean;
  preserveWhitespace?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 break-words text-sm leading-6",
          mono && "break-all font-number tabular-nums",
          preserveWhitespace && "whitespace-pre-wrap"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function CodeValue({ children }: { children: string }) {
  return (
    <code className="block max-w-full break-all rounded-box bg-neutral-900 p-3 font-number text-xs leading-5 text-neutral-0">
      {children}
    </code>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box bg-surface-secondary p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="mt-1 font-number text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function EligibilityFact({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-box bg-surface-secondary p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm", mono && "font-number tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

function SubmissionStep({
  complete,
  label,
  number,
}: {
  complete: boolean;
  label: string;
  number: string;
}) {
  return (
    <li className="flex min-h-10 items-center gap-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-number text-xs font-bold tabular-nums",
          complete
            ? "bg-green-100 text-green-900"
            : "bg-neutral-100 text-neutral-900"
        )}
      >
        {number}
      </span>
      <span>{label}</span>
    </li>
  );
}

function StateNotice({
  body,
  title,
  tone,
}: {
  body: string;
  title: string;
  tone: "success" | "warning" | "error";
}) {
  const styles = {
    success: "border-green-300 bg-green-50 text-green-950",
    warning: "border-amber-300 bg-amber-50 text-amber-950",
    error: "border-red-300 bg-red-50 text-red-950",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-box border p-4 text-sm", styles[tone])}>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-pretty leading-6">{body}</p>
    </div>
  );
}
