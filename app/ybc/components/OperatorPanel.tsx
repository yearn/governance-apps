"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AddressLink } from "@/components/ui/ExplorerLink";
import type {
  YbcAdminOperationId,
  YbcMockDataV1,
  YbcProposalType,
} from "@/lib/clients/ybc";
import { formatPercent } from "@/lib/format";
import { getYbcIdentity, type YbcIdentityMap } from "../identity";
import { ybcCopy as copy } from "../messages";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const OPERATION_TO_PROPOSAL_TYPE: Record<YbcAdminOperationId, YbcProposalType> = {
  "add-member": "addition",
  "remove-member": "expulsion",
};

type OperatorPanelProps = {
  data: YbcMockDataV1;
  identities: YbcIdentityMap;
  id?: string;
  createProposal?: (type: YbcProposalType) => void | Promise<void>;
};

type UnlockedOperatorPanelProps = {
  admin: NonNullable<YbcMockDataV1["admin"]>;
  data: YbcMockDataV1;
  identities: YbcIdentityMap;
  createProposal?: (type: YbcProposalType) => void | Promise<void>;
};

export function OperatorPanel({
  data,
  identities,
  id,
  createProposal,
}: OperatorPanelProps) {
  const admin = data.admin;
  const hasOperatorAccess = Boolean(admin?.isOperator && data.me.isOperator);

  return (
    <section
      id={id}
      className="space-y-6 rounded-box border border-yearn-blue/30 bg-yearn-blue/[0.04] p-6"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{copy.operatorPanel.eyebrow}</Badge>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {copy.operatorPanel.title}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-text-secondary">
            {copy.operatorPanel.description}
          </p>
        </div>
      </div>

      {hasOperatorAccess && admin ? (
        <UnlockedOperatorPanel
          admin={admin}
          data={data}
          identities={identities}
          createProposal={createProposal}
        />
      ) : (
        <LockedOperatorPanel data={data} />
      )}
    </section>
  );
}

function LockedOperatorPanel({ data }: { data: YbcMockDataV1 }) {
  return (
    <Card className="border-dashed bg-app/40">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-text-primary">
            {copy.operatorPanel.accessCard.title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {copy.operatorPanel.accessCard.body}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard
            label={copy.operatorPanel.accessCard.viewerLabel}
            value={getViewerRoleLabel(data)}
          />
          <SummaryCard
            label={copy.operatorPanel.accessCard.controlsLabel}
            value={copy.operatorPanel.accessCard.lockedValue}
          />
        </div>
        <p className="text-sm font-medium text-text-primary">
          {copy.operatorPanel.accessCard.hint}
        </p>
      </div>
    </Card>
  );
}

function UnlockedOperatorPanel({
  admin,
  data,
  identities,
  createProposal,
}: UnlockedOperatorPanelProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
      <div className="space-y-4">
        <Card className="bg-app/40">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-primary">
                {copy.operatorPanel.operationsTitle}
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-text-secondary">
                {copy.operatorPanel.operationsBody}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {admin.scopedOperations.map((operation) => {
                const operationCopy =
                  operation.id === "add-member"
                    ? copy.operatorPanel.operations.addMember
                    : copy.operatorPanel.operations.removeMember;

                return (
                  <Card key={operation.id} className="bg-surface p-5">
                    <div className="flex h-full flex-col gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-base font-bold text-text-primary">
                            {operationCopy.title}
                          </h4>
                          <Badge variant={operation.enabled ? "success" : "neutral"}>
                            {operation.enabled
                              ? copy.operatorPanel.operationEnabled
                              : copy.operatorPanel.operationDisabled}
                          </Badge>
                        </div>
                        <p className="text-sm leading-6 text-text-secondary">
                          {operationCopy.body}
                        </p>
                      </div>
                      <div className="mt-auto">
                        <Button
                          type="button"
                          size="sm"
                          variant={operation.id === "add-member" ? "primary" : "secondary"}
                          onClick={() =>
                            void createProposal?.(
                              OPERATION_TO_PROPOSAL_TYPE[operation.id]
                            )
                          }
                          disabled={!operation.enabled || !createProposal}
                        >
                          {operation.enabled && createProposal
                            ? operationCopy.cta
                            : copy.operatorPanel.operationDisabled}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="bg-app/40">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-text-primary">
              {copy.operatorPanel.operatorsTitle}
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              {copy.operatorPanel.operatorsBody}
            </p>
          </div>
          <ul className="mt-4 space-y-3">
            {admin.operators.map((operator) => {
              const isCurrentViewer =
                data.me.address?.toLowerCase() === operator.address.toLowerCase();
              const identity = getYbcIdentity(identities, operator.address);

              return (
                <li
                  key={operator.address}
                  className="rounded-box border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="min-w-0 break-words font-bold text-text-primary [overflow-wrap:anywhere]">
                        {identity.label}
                      </p>
                      <AddressLink address={operator.address} variant="compact" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={operator.role === "operator" ? "brand" : "neutral"}
                      >
                        {copy.operatorPanel.roles[operator.role]}
                      </Badge>
                      {isCurrentViewer ? (
                        <Badge variant="success">{copy.operatorPanel.roles.you}</Badge>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="bg-app/50 p-4">
          <p className="text-xs font-bold uppercase text-text-tertiary">
            {copy.operatorPanel.viewerTitle}
          </p>
          <div className="mt-4 space-y-3 text-sm text-text-secondary">
            <KeyValueRow
              label={copy.operatorPanel.viewer.wallet}
              value={
                data.me.address
                  ? <AddressLink address={data.me.address} variant="compact" />
                  : copy.operatorPanel.viewer.observerWallet
              }
            />
            <KeyValueRow
              label={copy.operatorPanel.viewer.accessRole}
              value={getViewerRoleLabel(data)}
            />
          </div>
        </Card>

        <Card className="bg-app/50 p-4">
          <p className="text-xs font-bold uppercase text-text-tertiary">
            {copy.operatorPanel.thresholdsTitle}
          </p>
          <div className="mt-4 space-y-3 text-sm text-text-secondary">
            <KeyValueRow
              label={copy.operatorPanel.thresholds.addition}
              value={formatPercent(admin.thresholds.additionBps / 10_000, 0)}
            />
            <KeyValueRow
              label={copy.operatorPanel.thresholds.expulsion}
              value={formatPercent(admin.thresholds.expulsionBps / 10_000, 0)}
            />
          </div>
        </Card>

        <Card className="bg-app/50 p-4">
          <p className="text-xs font-bold uppercase text-text-tertiary">
            {copy.operatorPanel.hooksTitle}
          </p>
          <div className="mt-4 space-y-4">
            <AddressRow
              label={copy.operatorPanel.hooks.membershipHook}
              address={admin.hooks.membershipHook}
            />
            <AddressRow
              label={copy.operatorPanel.hooks.rewardsDistributor}
              address={admin.hooks.rewardsDistributor}
            />
            <AddressRow
              label={copy.operatorPanel.hooks.bonusRecipient}
              address={admin.hooks.bonusRecipient}
            />
          </div>
        </Card>

        <Card className="bg-app/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase text-text-tertiary">
              {copy.operatorPanel.rewardStatusTitle}
            </p>
            <Badge
              variant={admin.rewardStatus.distributorFunded ? "success" : "warning"}
            >
              {admin.rewardStatus.distributorFunded
                ? copy.operatorPanel.rewardStatus.funded
                : copy.operatorPanel.rewardStatus.unfunded}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {copy.operatorPanel.rewardStatusBody}
          </p>
          <div className="mt-4 space-y-3 text-sm text-text-secondary">
            <KeyValueRow
              label={copy.operatorPanel.rewardStatus.lastSynced}
              value={formatUtcDateTime(admin.rewardStatus.lastSyncedAt)}
            />
          </div>
        </Card>

        <Card className="bg-app/50 p-4">
          <p className="text-xs font-bold uppercase text-text-tertiary">
            {copy.operatorPanel.guardrailsTitle}
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">
            {copy.operatorPanel.guardrails.map((guardrail) => (
              <li key={guardrail}>{guardrail}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box border border-border bg-surface p-4">
      <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
      <p className="mt-2 text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-medium text-text-primary">{value}</span>
    </div>
  );
}

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
      <AddressLink address={address} variant="compact" />
    </div>
  );
}

function getViewerRoleLabel(data: YbcMockDataV1) {
  if (data.me.isOperator) {
    return copy.operatorPanel.viewer.roles.operator;
  }

  if (data.me.isMember) {
    return copy.operatorPanel.viewer.roles.member;
  }

  return copy.operatorPanel.viewer.roles.observer;
}

function formatUtcDateTime(unixSeconds: number) {
  return `${DATE_TIME_FORMATTER.format(unixSeconds * 1000)} UTC`;
}
