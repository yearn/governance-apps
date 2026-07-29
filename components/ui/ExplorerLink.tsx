"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconCopy } from "@/components/icons/IconCopy";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import {
  getEtherscanAddressUrl,
  getEtherscanTransactionUrl,
} from "@/lib/explorer";
import { formatAddress } from "@/lib/format";

export type ExplorerLinkKind = "address" | "transaction";

export type ExplorerLinkProps = {
  value: string;
  kind: ExplorerLinkKind;
  label?: string;
  className?: string;
  copyLabel?: string;
  variant?: "default" | "compact" | "contract";
};

type AddressLinkProps = Omit<
  ExplorerLinkProps,
  "value" | "kind" | "copyLabel"
> & {
  address: string;
  copyLabel?: string;
};

type TransactionLinkProps = Omit<
  ExplorerLinkProps,
  "value" | "kind" | "copyLabel"
> & {
  hash: string;
  copyLabel?: string;
};

const COPY_FEEDBACK_DURATION_MS = 1_200;

export function ExplorerLink({
  value,
  kind,
  label,
  className,
  copyLabel,
  variant = "default",
}: ExplorerLinkProps) {
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<number | undefined>(undefined);
  const statusId = useId();
  const href =
    kind === "address"
      ? getEtherscanAddressUrl(value)
      : getEtherscanTransactionUrl(value);
  const visibleLabel = href ? (label ?? formatAddress(value)) : value;
  const subject = kind === "address" ? "address" : "transaction hash";
  const resource =
    kind === "address" ? "Ethereum address" : "Ethereum transaction";

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const copyValue = async () => {
    const didCopy = await copyTextToClipboard(value);
    if (!didCopy) return;

    setCopied(true);
    if (copyResetTimer.current) {
      window.clearTimeout(copyResetTimer.current);
    }
    copyResetTimer.current = window.setTimeout(() => {
      setCopied(false);
    }, COPY_FEEDBACK_DURATION_MS);
  };

  if (!href) {
    if (variant === "contract") {
      return (
        <code
          className={cn(
            "rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-number text-[11px] font-medium tracking-wide text-text-secondary",
            className,
          )}
          title={`Invalid Ethereum ${subject}: ${value}`}
        >
          {formatAddress(value)}
        </code>
      );
    }

    return (
      <code
        className={cn(
          "inline-flex max-w-full min-w-0 items-center truncate font-number font-medium tracking-wide text-text-secondary",
          variant === "compact"
            ? "min-h-10 text-xs"
            : "min-h-10 rounded border border-border bg-surface-secondary px-1.5 py-0.5 text-[11px]",
          className,
        )}
        title={`Invalid Ethereum ${subject}: ${value}`}
      >
        {visibleLabel}
      </code>
    );
  }

  if (variant === "contract") {
    return (
      <span
        className={cn(
          "group/contract inline-flex items-center gap-1.5",
          className,
        )}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${resource} ${value} on Etherscan`}
          className="inline-flex rounded transition-[color] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          title="View on Etherscan"
        >
          <code className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-number text-[11px] font-medium tracking-wide text-text-secondary transition-[border-color,color] duration-150 ease-out group-hover/contract:border-text-tertiary group-hover/contract:text-text-primary group-focus-within/contract:border-text-tertiary group-focus-within/contract:text-text-primary">
            {visibleLabel}
          </code>
        </a>

        <button
          type="button"
          onClick={() => {
            void copyValue();
          }}
          className="inline-flex items-center justify-center rounded p-0.5 text-text-tertiary opacity-0 transition-[color,opacity] duration-150 ease-out group-hover/contract:opacity-100 group-focus-within/contract:opacity-100 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          aria-describedby={statusId}
          aria-label={copyLabel ?? "Copy contract address"}
          title={copied ? "Address copied" : "Copy address"}
        >
          <IconCopy
            className={cn(
              "size-3 transition-[color] duration-150 ease-out",
              copied && "text-text-primary",
            )}
            aria-hidden="true"
          />
        </button>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded p-0.5 text-text-tertiary opacity-0 transition-[color,opacity] duration-150 ease-out group-hover/contract:opacity-100 group-focus-within/contract:opacity-100 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          aria-label={`Open ${resource} ${value} in Etherscan`}
          title="Open in Etherscan"
        >
          <IconLinkOut className="size-3" aria-hidden="true" />
        </a>

        <span id={statusId} className="sr-only" role="status" aria-live="polite">
          {copied ? `${subject} copied` : ""}
        </span>
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "group/explorer relative inline-flex min-h-10 max-w-full min-w-0 items-center [@media(pointer:fine)]:pr-10",
          className,
        )}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${resource} ${value} on Etherscan`}
          className="relative z-10 inline-flex min-h-10 min-w-0 max-w-full items-center gap-1 rounded px-0.5 text-xs font-medium tracking-wide text-text-secondary transition-[color] duration-150 ease-out hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          title="View on Etherscan"
        >
          {label ? (
            <span className="min-w-0 truncate">{visibleLabel}</span>
          ) : (
            <code className="min-w-0 truncate font-number">{visibleLabel}</code>
          )}
          <IconLinkOut
            className="hidden size-3 shrink-0 text-text-tertiary opacity-0 transition-[color,opacity] duration-150 ease-out [@media(pointer:fine)]:block group-hover/explorer:opacity-100 group-focus-within/explorer:opacity-100"
            aria-hidden="true"
          />
        </a>

        <button
          type="button"
          onClick={() => {
            void copyValue();
          }}
          className="pointer-events-none absolute right-0 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded text-text-tertiary opacity-0 transition-[background-color,color,opacity] duration-150 ease-out [@media(pointer:fine)]:inline-flex group-hover/explorer:pointer-events-auto group-hover/explorer:opacity-100 group-focus-within/explorer:pointer-events-auto group-focus-within/explorer:opacity-100 hover:bg-surface-secondary hover:text-text-primary focus:pointer-events-auto focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          aria-describedby={statusId}
          aria-label={copyLabel ?? `Copy ${subject}`}
          title={copied ? "Copied" : copyLabel ?? `Copy ${subject}`}
        >
          <IconCopy
            className={cn(
              "size-3 transition-[color] duration-150 ease-out",
              copied && "text-text-primary",
            )}
            aria-hidden="true"
          />
        </button>

        <span id={statusId} className="sr-only" role="status" aria-live="polite">
          {copied ? `${subject} copied` : ""}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "group/explorer inline-flex max-w-full min-w-0 items-center gap-1.5",
        className,
      )}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${resource} ${value} on Etherscan`}
        className="inline-flex min-h-10 min-w-10 max-w-full items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        title="View on Etherscan"
      >
        <code className="min-w-0 truncate rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-number text-[11px] font-medium tracking-wide text-text-secondary transition-[border-color,color] duration-150 ease-out group-hover/explorer:border-text-tertiary group-hover/explorer:text-text-primary group-focus-within/explorer:border-text-tertiary group-focus-within/explorer:text-text-primary">
          {visibleLabel}
        </code>
        <IconLinkOut
          className="size-3 shrink-0 text-text-tertiary transition-colors duration-150 ease-out group-hover/explorer:text-text-primary group-focus-within/explorer:text-text-primary"
          aria-hidden="true"
        />
      </a>

      <button
        type="button"
        onClick={() => {
          void copyValue();
        }}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded text-text-tertiary transition-[background-color,color] duration-150 ease-out hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        aria-describedby={statusId}
        aria-label={copyLabel ?? `Copy ${subject}`}
        title={copied ? "Copied" : copyLabel ?? `Copy ${subject}`}
      >
        <IconCopy
          className={cn(
            "size-3 transition-[color] duration-150 ease-out",
            copied && "text-text-primary",
          )}
          aria-hidden="true"
        />
      </button>

      <span id={statusId} className="sr-only" role="status" aria-live="polite">
        {copied ? `${subject} copied` : ""}
      </span>
    </span>
  );
}

export function AddressLink({
  address,
  copyLabel,
  ...props
}: AddressLinkProps) {
  return (
    <ExplorerLink
      {...props}
      value={address}
      kind="address"
      copyLabel={copyLabel ?? "Copy address"}
    />
  );
}

export function TransactionLink({
  hash,
  copyLabel,
  ...props
}: TransactionLinkProps) {
  return (
    <ExplorerLink
      {...props}
      value={hash}
      kind="transaction"
      copyLabel={copyLabel ?? "Copy transaction hash"}
    />
  );
}
