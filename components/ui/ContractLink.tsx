"use client";

import { useEffect, useRef, useState } from "react";
import { formatAddress } from "@/lib/format";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { IconCopy } from "@/components/icons/IconCopy";
import { cn } from "@/lib/cn";

type ContractLinkProps = {
  address: string;
  className?: string;
};

export function ContractLink({ address, className }: ContractLinkProps) {
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const copyAddress = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = address;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        return;
      }

      setCopied(true);
      if (copyResetTimer.current) {
        window.clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch {
      // Copy failure should not interrupt normal UI interactions.
    }
  };

  return (
    <span className={cn("group/contract inline-flex items-center gap-1.5", className)}>
      <a
        href={`https://etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        title="View on Etherscan"
      >
        <code className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-number text-[11px] font-medium tracking-wide text-text-secondary transition-colors group-hover/contract:border-text-tertiary group-hover/contract:text-text-primary group-focus-within/contract:border-text-tertiary group-focus-within/contract:text-text-primary">
          {formatAddress(address)}
        </code>
      </a>

      <button
        type="button"
        onClick={() => {
          void copyAddress();
        }}
        className="inline-flex items-center justify-center rounded p-0.5 text-text-tertiary opacity-0 transition-all group-hover/contract:opacity-100 group-focus-within/contract:opacity-100 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        aria-label="Copy contract address"
        title={copied ? "Address copied" : "Copy address"}
      >
        <IconCopy
          className={cn(
            "size-3 transition-colors",
            copied && "text-text-primary",
          )}
          aria-hidden="true"
        />
      </button>

      <a
        href={`https://etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded p-0.5 text-text-tertiary opacity-0 transition-all group-hover/contract:opacity-100 group-focus-within/contract:opacity-100 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        aria-label="Open in Etherscan"
        title="Open in Etherscan"
      >
        <IconLinkOut className="size-3" aria-hidden="true" />
      </a>
    </span>
  );
}
