"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AddressLink, TransactionLink } from "@/components/ui/ExplorerLink";
import { UtcTime } from "@/components/ui/UtcTime";
import { IconCopy } from "@/components/icons/IconCopy";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { copyTextToClipboard } from "@/lib/clipboard";
import { formatUtcDateTime } from "@/lib/date";
import {
  formatDaoPublicAnalysisError,
  serializeDaoProposalRef,
  type DaoAnalysis,
  type DaoDecodedCall,
  type DaoProposal,
  type DaoProposalReadEnvelope,
  type DaoProposalEvent,
  type DaoSimulation,
} from "@/lib/clients/dao";
import { getButtonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { daoRouteControlClassName } from "../../components/DaoRouteFrame";
import {
  ProposalStatusBadge,
  ProposalTiming,
  ProposalTypeBadge,
  ProposalVoteSummary,
} from "../../components/ProposalReadPrimitives";
import { daoCopy } from "../../messages";

export function ProposalDetail({
  actionPanel = null,
  envelope,
  now: runtimeNow,
}: {
  actionPanel?: React.ReactNode;
  envelope: DaoProposalReadEnvelope;
  now?: number;
}) {
  const { feed, proposal } = envelope;
  const now = runtimeNow ?? feed.canonicalBlock.timestamp;
  const proposalId = proposal.ref.proposalId.toString();
  const title = proposal.content.value?.title ?? daoCopy.detail.eyebrow(proposalId);
  const summary = proposal.content.value?.summary;

  return (
    <article className="min-w-0 space-y-5">
      <Link
        href="/dao"
        className={getButtonClassName({
          variant: "ghost",
          size: "sm",
          className: `${daoRouteControlClassName} -ml-3`,
        })}
      >
        {daoCopy.detail.backToBoard}
      </Link>

      <Card className="min-w-0 space-y-5 overflow-hidden">
        <div className="min-w-0 space-y-3">
          <p className="break-words font-number text-xs font-bold tabular-nums text-text-secondary [overflow-wrap:anywhere]">
            {daoCopy.detail.eyebrow(proposalId)}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ProposalStatusBadge status={proposal.displayStatus} />
            <ProposalTypeBadge proposal={proposal} />
          </div>
          <h2 className="text-balance text-2xl font-bold md:text-4xl">
            {title}
          </h2>
          {summary ? (
            <p className="max-w-3xl text-pretty text-base leading-7 text-text-secondary">
              {summary}
            </p>
          ) : null}
        </div>

        <dl className="grid min-w-0 gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <HeaderFact
            label={daoCopy.labels.proposalId}
            value={proposalId}
            numeric
          />
          <HeaderFact
            label={daoCopy.labels.status}
            value={daoCopy.status[proposal.displayStatus]}
          />
          <HeaderFact
            label={daoCopy.labels.type}
            value={daoCopy.proposalType[proposal.type]}
          />
        </dl>

        <div className="grid min-w-0 gap-4 border-t border-border pt-5 md:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-bold text-text-secondary">
              {daoCopy.detail.proposedBy}
            </p>
            <AddressLink
              address={proposal.proposer}
              variant="compact"
              copyLabel={daoCopy.detail.copyValue(daoCopy.detail.proposedBy)}
            />
          </div>
          <ProposalTiming now={now} proposal={proposal} showExact />
        </div>

        <DiscussionLink proposal={proposal} />
        <ContentWarning proposal={proposal} />
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <aside
          className="order-first min-w-0 space-y-5 lg:order-last"
          aria-label={daoCopy.detail.actionSidebar}
        >
          {actionPanel}
          <Card className="min-w-0 space-y-5" aria-label={daoCopy.detail.voteResults}>
            <div className="space-y-3">
              <h3 className="text-balance text-xl font-bold">
                {daoCopy.detail.voteResults}
              </h3>
              <ProposalVoteSummary proposal={proposal} />
            </div>

            {proposal.type === "signal" &&
            proposal.displayStatus === "approved" ? (
              <div className="space-y-1 border-t border-border pt-4">
                <p
                  className="text-lg font-bold text-green-800 dark:text-green-300"
                  data-testid="dao-approved-signal"
                >
                  {daoCopy.detail.approvedSignal}
                </p>
                <p className="text-pretty text-sm font-bold text-text-secondary">
                  {daoCopy.detail.noExecutableActions}
                </p>
              </div>
            ) : null}

            <details className="group border-t border-border pt-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded py-2 text-sm font-bold transition-[color] duration-150 ease-out hover:text-yearn-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none dark:hover:text-blue-300 [&::-webkit-details-marker]:hidden">
                <span>{daoCopy.detail.rules}</span>
                <span
                  aria-hidden="true"
                  className="text-lg transition-transform duration-150 ease-out group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <div className="space-y-2 pb-2 pt-1">
                <p className="text-pretty text-sm font-bold">
                  {daoCopy.detail.noQuorum}
                </p>
                <p className="text-pretty text-xs leading-5 text-text-secondary">
                  {daoCopy.detail.thresholdSnapshot}
                </p>
              </div>
            </details>
          </Card>
        </aside>

        <div className="order-last min-w-0 space-y-5 lg:order-first">
          <ImmutableContent proposal={proposal} />
          <ProposalLifecycle proposal={proposal} />
          <ExecutionAnalysis proposal={proposal} />
          <TechnicalDetails feed={feed} proposal={proposal} />
        </div>
      </div>
    </article>
  );
}

function DiscussionLink({ proposal }: { proposal: DaoProposal }) {
  const discussion = proposal.discussion;
  if (!discussion.url) {
    return (
      <p className="text-pretty text-sm font-bold text-text-secondary">
        {daoCopy.detail.discussionUnavailable}
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
      <a
        href={discussion.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={daoCopy.detail.forumAccessibleLabel}
        className={getButtonClassName({
          variant: "secondary",
          size: "sm",
          className: `${daoRouteControlClassName} max-w-full gap-1.5`,
        })}
      >
        <span className="truncate">{daoCopy.detail.discussion}</span>
        <IconLinkOut className="size-3.5 shrink-0" aria-hidden />
      </a>
      <p className="text-pretty text-xs font-bold text-text-secondary">
        {discussion.state === "verified"
          ? daoCopy.detail.discussionVerified
          : daoCopy.detail.discussionUnverified}
      </p>
    </div>
  );
}

function ContentWarning({ proposal }: { proposal: DaoProposal }) {
  if (proposal.content.state === "available") return null;
  const warning = daoCopy.detail.contentWarnings[proposal.content.state];
  const statusTitle =
    proposal.content.state === "unavailable"
      ? daoCopy.detail.contentUnavailable
      : warning.title;
  return (
    <div
      role="status"
      className="space-y-2 rounded-box bg-red-50 p-4 text-red-950 dark:bg-red-950/40 dark:text-red-100"
    >
      <p className="text-pretty font-bold">{statusTitle}</p>
      <p className="max-w-3xl text-pretty text-sm leading-6">
        {warning.title}. {warning.body}
      </p>
      {proposal.content.error ? (
        <p className="break-words font-number text-xs [overflow-wrap:anywhere]">
          {daoCopy.detail.contentError}: {proposal.content.error}
        </p>
      ) : null}
    </div>
  );
}

function ImmutableContent({ proposal }: { proposal: DaoProposal }) {
  const content = proposal.content.value;
  return (
    <Card className="min-w-0 space-y-5">
      <SectionHeading
        title={daoCopy.detail.immutableContent}
        description={daoCopy.detail.immutableContentDescription}
      />

      {content ? (
        <div className="min-w-0 space-y-6">
          <ContentBlock label={daoCopy.detail.summary} value={content.summary} />
          <ContentBlock
            label={daoCopy.detail.specification}
            value={content.specification}
          />
          {content.links.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">
                {daoCopy.detail.supportingLinks}
              </h4>
              <ul className="space-y-2">
                {content.links.map((link) => (
                  <li key={`${link.label}:${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded text-sm font-bold text-yearn-blue transition-[color] duration-150 ease-out hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      <span className="truncate">{link.label}</span>
                      <IconLinkOut className="size-3.5 shrink-0" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 rounded-box bg-surface-secondary/60 p-4">
          <p className="text-pretty font-bold">
            {proposal.content.state === "invalid"
              ? daoCopy.detail.contentWarnings.invalid.title
              : daoCopy.detail.contentWarnings.unavailable.title}
          </p>
          <p className="text-pretty text-sm leading-6 text-text-secondary">
            {proposal.content.state === "invalid"
              ? daoCopy.detail.contentWarnings.invalid.body
              : daoCopy.detail.contentWarnings.unavailable.body}
          </p>
        </div>
      )}
    </Card>
  );
}

function ContentBlock({ label, value }: { label: string; value: string }) {
  return (
    <section className="min-w-0 space-y-2">
      <h4 className="text-balance text-base font-bold">{label}</h4>
      <p className="max-w-[75ch] whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">
        {value}
      </p>
    </section>
  );
}

function ProposalLifecycle({ proposal }: { proposal: DaoProposal }) {
  const terminalEvent = findTerminalEvent(proposal.events);
  const terminalReason =
    terminalEvent?.type === "flag"
      ? proposal.moderation.flagReason
      : terminalEvent?.type === "veto"
        ? proposal.moderation.vetoReason
        : null;

  return (
    <Card className="min-w-0 space-y-5">
      <SectionHeading
        title={daoCopy.detail.lifecycle}
        description={daoCopy.detail.lifecycleDescription}
      />

      <ol className="min-w-0 divide-y divide-border">
        <LifecycleRow
          label={daoCopy.detail.lifecycleSteps.proposed}
          value={
            <>
              {daoCopy.detail.createdOn}{" "}
              <UtcTime timestamp={proposal.createdAt} />
            </>
          }
        />
        <LifecycleRow
          label={daoCopy.detail.lifecycleSteps.voting}
          value={
            <>
              <UtcTime timestamp={proposal.voteStartsAt} /> –{" "}
              <UtcTime timestamp={proposal.voteEndsAt} />
            </>
          }
        />
        <LifecycleRow
          label={daoCopy.detail.lifecycleSteps.decision}
          value={<ProposalStatusBadge status={proposal.displayStatus} />}
        />
        {proposal.type === "executable" &&
        proposal.executionStartsAt !== null &&
        proposal.executionEndsAt !== null ? (
          <LifecycleRow
            label={daoCopy.detail.lifecycleSteps.execution}
            value={
              <>
                <UtcTime timestamp={proposal.executionStartsAt} /> –{" "}
                <UtcTime timestamp={proposal.executionEndsAt} />
              </>
            }
          />
        ) : null}
        {terminalEvent ? (
          <LifecycleRow
            label={daoCopy.detail.lifecycleSteps.terminalEvent}
            value={daoCopy.detail.eventRecorded(
              formatEventType(terminalEvent.type),
              terminalEvent.log.blockNumber.toString()
            )}
          />
        ) : null}
      </ol>

      {terminalReason && terminalEvent ? (
        <div className="space-y-1 rounded-box bg-surface-secondary/60 p-4">
          <p className="text-xs font-bold text-text-secondary">
            {terminalEvent.type === "flag"
              ? daoCopy.detail.terminalReasons.flag
              : daoCopy.detail.terminalReasons.veto}
          </p>
          <p className="break-words text-pretty text-sm [overflow-wrap:anywhere]">
            {terminalReason}
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function LifecycleRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="grid min-w-0 gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <span className="text-xs font-bold text-text-secondary">{label}</span>
      <span className="min-w-0 break-words font-number text-sm tabular-nums [overflow-wrap:anywhere]">
        {value}
      </span>
    </li>
  );
}

function ExecutionAnalysis({ proposal }: { proposal: DaoProposal }) {
  const analysis = proposal.analysis;
  const stateCopy = daoCopy.detail.analysisStates[analysis.state];
  const analysisLabel =
    proposal.type === "signal"
      ? daoCopy.detail.noExecutableActions
      : stateCopy.label;
  const analysisBody =
    proposal.type === "signal" ? daoCopy.detail.signalAnalysis : stateCopy.body;

  return (
    <Card className="min-w-0 space-y-5">
      <SectionHeading
        title={daoCopy.detail.analysis}
        description={daoCopy.detail.analysisDescription}
      />

      <div className="space-y-2">
        <Badge
          variant={analysis.state === "failed" ? "error" : "neutral"}
          className={cn(
            "font-sans",
            analysis.state === "failed" &&
              "dark:bg-red-950 dark:text-red-200"
          )}
        >
          {analysisLabel}
        </Badge>
        <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
          {analysisBody}
        </p>
        {analysis.error ? (
          <p className="break-words text-pretty text-sm font-bold text-error-700 dark:text-red-300 [overflow-wrap:anywhere]">
            {formatDaoPublicAnalysisError(analysis.error)}
          </p>
        ) : null}
      </div>

      <ScriptIntegrity proposal={proposal} />

      {proposal.type === "executable" ? (
        <>
          <SimulationDetails simulation={analysis.proposalSimulation} />
          <DecodedCalls analysis={analysis} />
        </>
      ) : null}
    </Card>
  );
}

function ScriptIntegrity({ proposal }: { proposal: DaoProposal }) {
  const state = proposal.script.hashVerified;
  return (
    <p
      role={state === false ? "alert" : "status"}
      className={cn(
        "text-pretty text-sm font-bold",
        state === false
          ? "text-error-700 dark:text-red-300"
          : state === true
            ? "text-success-700 dark:text-green-300"
            : "text-text-secondary"
      )}
    >
      {state === true
        ? daoCopy.detail.scriptHashVerified
        : state === false
          ? daoCopy.detail.scriptHashMismatch
          : daoCopy.detail.scriptUnavailable}
    </p>
  );
}

function SimulationDetails({ simulation }: { simulation: DaoSimulation }) {
  return (
    <section className="min-w-0 space-y-3 border-t border-border pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-balance text-base font-bold">
          {daoCopy.detail.simulation}
        </h4>
        <Badge
          variant={simulation.state === "failed" ? "error" : "neutral"}
          className={cn(
            "font-sans",
            simulation.state === "failed" &&
              "dark:bg-red-950 dark:text-red-200"
          )}
        >
          {daoCopy.detail.simulationStates[simulation.state]}
        </Badge>
      </div>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TechnicalFact
          label={daoCopy.detail.simulationMethod}
          value={simulation.method ?? daoCopy.detail.unavailableValue}
        />
        <TechnicalFact
          label={daoCopy.detail.simulationEngine}
          value={
            simulation.engine ?? daoCopy.detail.unavailableValue
          }
        />
        <TechnicalFact
          label={daoCopy.detail.simulationBlock}
          value={
            simulation.blockNumber?.toString() ?? daoCopy.detail.unavailableValue
          }
          numeric
        />
        <TechnicalFact
          label={daoCopy.detail.simulationTimestamp}
          value={simulation.simulatedAt ?? daoCopy.detail.unavailableValue}
          numeric
        />
        <TechnicalFact
          label={daoCopy.detail.simulationCaller}
          value={simulation.caller ?? daoCopy.detail.unavailableValue}
          code
        />
        {simulation.error ? (
          <TechnicalFact
            label={daoCopy.detail.simulationError}
            value={
              formatDaoPublicAnalysisError(simulation.error)
            }
          />
        ) : null}
      </dl>
    </section>
  );
}

function DecodedCalls({ analysis }: { analysis: DaoAnalysis }) {
  if (analysis.calls.length === 0) return null;
  return (
    <section className="min-w-0 space-y-3 border-t border-border pt-5">
      <h4 className="text-balance text-base font-bold">
        {daoCopy.detail.orderedCalls}
      </h4>
      <ol className="min-w-0 space-y-3">
        {analysis.calls.map((call) => (
          <DecodedCall
            key={`${call.index}:${call.offset}:${call.target}`}
            call={call}
          />
        ))}
      </ol>
    </section>
  );
}

function DecodedCall({ call }: { call: DaoDecodedCall }) {
  const stateLabel =
    call.decodeStatus === "verified"
      ? daoCopy.detail.verifiedDecoding
      : call.decodeStatus === "unknown"
        ? daoCopy.detail.unknownCall
        : daoCopy.detail.failedDecoding;
  return (
    <li className="min-w-0 space-y-4 rounded-box bg-surface-secondary/60 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="font-number text-xs font-bold tabular-nums text-text-secondary">
          {daoCopy.detail.callNumber(call.index + 1)}
        </p>
        <Badge
          variant={call.decodeStatus === "verified" ? "success" : "warning"}
          className={cn(
            "font-sans",
            call.decodeStatus === "verified" &&
              "dark:bg-green-950 dark:text-green-200"
          )}
        >
          {stateLabel}
        </Badge>
      </div>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TechnicalFact
          label={daoCopy.detail.targetContract}
          value={
            call.contractName ?? daoCopy.detail.unknownContract
          }
        />
        <div className="min-w-0 space-y-1">
          <dt className="text-xs font-bold text-text-secondary">
            {daoCopy.detail.target}
          </dt>
          <dd className="min-w-0">
            <AddressLink
              address={call.target}
              variant="compact"
              copyLabel={daoCopy.detail.copyValue(daoCopy.detail.target)}
              showCopyOnCoarsePointer
            />
          </dd>
        </div>
        <TechnicalFact
          label={daoCopy.detail.calldataSize}
          value={daoCopy.detail.bytes(call.calldataBytes)}
          numeric
        />
        <TechnicalFact
          label={daoCopy.detail.function}
          value={
            call.functionSignature ?? daoCopy.detail.unavailableValue
          }
          code
        />
        <TechnicalFact
          label={daoCopy.detail.abiSource}
          value={
            call.abiSource ?? daoCopy.detail.noVerifiedAbi
          }
          code={call.abiSource !== null}
        />
        {call.arguments.length > 0 ? (
          <TechnicalFact
            label={daoCopy.detail.arguments}
            value={call.arguments
              .map(
                (argument) =>
                  `${argument.name} (${argument.type}): ${argument.value}`
              )
              .join("\n")}
            code
          />
        ) : null}
        {call.decodeStatus !== "verified" ? (
          <>
            <TechnicalFact
              label={daoCopy.detail.selector}
              value={call.selector ?? daoCopy.detail.unavailableValue}
              code
            />
            <TechnicalFact
              label={daoCopy.detail.calldata}
              value={call.calldata}
              code
              fullWidth
            />
          </>
        ) : null}
      </dl>
    </li>
  );
}

function TechnicalDetails({
  feed,
  proposal,
}: {
  feed: DaoProposalReadEnvelope["feed"];
  proposal: DaoProposal;
}) {
  const contract = feed.contracts.find(
    (entry) =>
      entry.votingAddress.toLowerCase() ===
      proposal.ref.votingAddress.toLowerCase()
  );
  const proposeEvent = proposal.events.find((event) => event.type === "propose");
  const moderationEvent = [...proposal.events]
    .reverse()
    .find((event) => event.type === "flag" || event.type === "veto");

  return (
    <Card className="min-w-0 p-0">
      <details className="group min-w-0">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-box px-6 py-4 transition-[background-color] duration-150 ease-out hover:bg-surface-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-primary motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-balance font-bold">
              {daoCopy.detail.technicalDetails}
            </span>
            <span className="mt-1 block text-pretty text-xs font-normal text-text-secondary">
              {daoCopy.detail.technicalSummary}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-xl transition-transform duration-150 ease-out group-open:rotate-45 motion-reduce:transition-none"
          >
            +
          </span>
        </summary>

        <dl className="min-w-0 divide-y divide-border border-t border-border px-6 pb-2">
          <TechnicalDetailRow
            label={daoCopy.detail.chainId}
            value={proposal.ref.chainId.toString()}
          />
          <TechnicalLinkRow
            label={daoCopy.detail.votingContract}
            value={proposal.ref.votingAddress}
            kind="address"
          />
          <TechnicalLinkRow
            label={daoCopy.detail.voterContract}
            value={contract?.voterAddress ?? null}
            kind="address"
          />
          <TechnicalLinkRow
            label={daoCopy.detail.executorContract}
            value={contract?.executorAddress ?? null}
            kind="address"
          />
          <TechnicalDetailRow
            label={daoCopy.detail.proposalIdentity}
            value={serializeDaoProposalRef(proposal.ref)}
            copy
          />
          <TechnicalLinkRow
            label={daoCopy.detail.creationTransaction}
            value={proposeEvent?.log.transactionHash ?? null}
            kind="transaction"
          />
          <TechnicalDetailRow
            label={daoCopy.detail.creationBlock}
            value={
              proposeEvent?.log.blockNumber.toString() ??
              daoCopy.detail.unavailableValue
            }
          />
          <TechnicalDetailRow
            label={daoCopy.detail.rawStatus}
            value={proposal.protocolStatus.toUpperCase()}
          />
          <TechnicalDetailRow
            label={daoCopy.detail.contentCid}
            value={proposal.content.cid ?? daoCopy.detail.unavailableValue}
            copy={proposal.content.cid !== null}
          />
          <TechnicalDetailRow
            label={daoCopy.detail.contentDigest}
            value={proposal.content.digest}
            copy
          />
          <TechnicalDetailRow
            label={daoCopy.detail.scriptHash}
            value={proposal.script.hash}
            copy
          />
          <TechnicalDetailRow
            label={daoCopy.detail.scriptBytes}
            value={proposal.script.bytes ?? daoCopy.detail.unavailableValue}
            copy={proposal.script.bytes !== null}
          />
          {moderationEvent ? (
            <>
              <TechnicalDetailRow
                label={formatEventType(moderationEvent.type)}
                value={
                  moderationEvent.reason ?? daoCopy.detail.unavailableValue
                }
              />
              <TechnicalLinkRow
                label={`${formatEventType(moderationEvent.type)} transaction`}
                value={moderationEvent.log.transactionHash}
                kind="transaction"
              />
            </>
          ) : null}
          <TechnicalDetailRow
            label={daoCopy.detail.feedSnapshotBlock}
            value={
              feed.canonicalBlock.number.toString()
            }
          />
          <TechnicalDetailRow
            label={daoCopy.detail.feedSnapshotTime}
            value={formatUtcDateTime(feed.canonicalBlock.timestamp)}
          />
        </dl>
      </details>
    </Card>
  );
}

function TechnicalDetailRow({
  copy = false,
  label,
  value,
}: {
  copy?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd className="min-w-0">
        {copy ? (
          <CopyableValue label={label} value={value} />
        ) : (
          <code className="block max-w-full whitespace-pre-wrap break-all font-number text-xs tabular-nums">
            {value}
          </code>
        )}
      </dd>
    </div>
  );
}

function TechnicalLinkRow({
  kind,
  label,
  value,
}: {
  kind: "address" | "transaction";
  label: string;
  value: string | null;
}) {
  return (
    <div className="grid min-w-0 gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd className="min-w-0">
        {value ? (
          kind === "address" ? (
            <AddressLink
              address={value}
              variant="compact"
              copyLabel={daoCopy.detail.copyValue(label)}
              showCopyOnCoarsePointer
            />
          ) : (
            <TransactionLink
              hash={value}
              variant="compact"
              copyLabel={daoCopy.detail.copyValue(label)}
            />
          )
        ) : (
          <span className="text-sm text-text-secondary">
            {daoCopy.detail.unavailableValue}
          </span>
        )}
      </dd>
    </div>
  );
}

function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    [],
  );
  const statusId = useId();

  const copy = async () => {
    const didCopy = await copyTextToClipboard(value);
    if (!didCopy) return;
    setCopied(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 1_200);
  };

  return (
    <div className="flex min-w-0 items-start gap-2">
      <code className="max-h-40 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-box bg-surface-secondary/60 p-2 font-number text-xs tabular-nums">
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          void copy();
        }}
        aria-describedby={statusId}
        aria-label={daoCopy.detail.copyValue(label)}
        title={
          copied
            ? daoCopy.detail.copiedValue(label)
            : daoCopy.detail.copyValue(label)
        }
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-box text-text-secondary transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <IconCopy className="size-4" aria-hidden />
      </button>
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {copied ? daoCopy.detail.copiedValue(label) : ""}
      </span>
    </div>
  );
}

function TechnicalFact({
  code = false,
  fullWidth = false,
  label,
  numeric = false,
  value,
}: {
  code?: boolean;
  fullWidth?: boolean;
  label: string;
  numeric?: boolean;
  value: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", fullWidth && "sm:col-span-2")}>
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd
        className={cn(
          "min-w-0 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]",
          (code || numeric) && "font-number tabular-nums",
          code && "rounded-box bg-surface p-2 text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-balance text-xl font-bold md:text-2xl">{title}</h3>
      <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function HeaderFact({
  label,
  numeric = false,
  value,
}: {
  label: string;
  numeric?: boolean;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd
        className={cn(
          "break-words text-sm [overflow-wrap:anywhere]",
          numeric && "font-number tabular-nums"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function findTerminalEvent(events: DaoProposalEvent[]) {
  return [...events]
    .reverse()
    .find((event) =>
      ["retract", "flag", "veto", "execute"].includes(event.type)
    );
}

function formatEventType(type: DaoProposalEvent["type"]): string {
  if (type === "retract") return "Retraction";
  if (type === "flag") return "Flag";
  if (type === "veto") return "Veto";
  if (type === "execute") return "Execution";
  if (type === "vote") return "Vote";
  return "Proposal";
}
