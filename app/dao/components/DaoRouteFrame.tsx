import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { daoCopy } from "../messages";

type DaoRouteFrameProps = {
  children: ReactNode;
};

const ROUTE_CONTROL_CLASS_NAME =
  "h-11 motion-reduce:transition-none motion-reduce:active:scale-100";

export function DaoRouteFrame({ children }: DaoRouteFrameProps) {
  return (
    <div className="min-w-0 bg-app text-text-primary">
      <div className="container mx-auto min-w-0 space-y-5 px-4 py-8 md:px-6 md:py-10">
        {children}
      </div>
    </div>
  );
}

export function DaoBreadcrumbs({
  items,
}: {
  items: readonly { href?: string; label: string }[];
}) {
  return (
    <nav aria-label={daoCopy.navigation.hierarchyLabel}>
      <ol className="flex min-h-10 min-w-0 max-w-full items-center overflow-hidden text-sm font-medium">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li
              key={`${item.label}:${index}`}
              className={`flex min-w-0 items-center gap-1.5 ${
                isCurrent ? "flex-1" : "shrink-0"
              }`}
            >
              {index > 0 ? (
                <span aria-hidden="true" className="select-none text-text-tertiary">
                  /
                </span>
              ) : null}
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-10 min-w-0 items-center rounded-md px-2 text-text-secondary transition-[background-color,color] duration-150 ease-out hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none"
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className="block min-w-0 flex-1 truncate px-2 text-text-secondary"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function DaoWalletNotice({
  context = "browse",
}: {
  context?: "browse" | "propose";
}) {
  return (
    <Card variant="flat" role="status" className="space-y-1 p-4">
      <h2 className="text-balance text-base font-bold">
        {daoCopy.wallet.disconnectedTitle}
      </h2>
      <p className="max-w-3xl text-pretty text-sm leading-6 text-text-secondary">
        {context === "propose"
          ? daoCopy.wallet.proposeDisconnected
          : daoCopy.wallet.browseDisconnected}
      </p>
    </Card>
  );
}

export function DaoLoadingPanel({ message }: { message: string }) {
  return (
    <Card
      role="status"
      aria-busy="true"
      className="space-y-5 overflow-hidden"
    >
      <p className="text-pretty font-bold">{message}</p>
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-5 w-36 motion-reduce:animate-none" />
        <Skeleton className="h-8 w-full max-w-xl motion-reduce:animate-none" />
        <Skeleton className="h-4 w-full max-w-2xl motion-reduce:animate-none" />
      </div>
    </Card>
  );
}

export function DaoErrorPanel({
  body,
  onRetry,
  retryLabel,
  title,
}: {
  body: string;
  onRetry: () => void;
  retryLabel: string;
  title: string;
}) {
  return (
    <Card role="alert" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-balance text-xl font-bold">{title}</h2>
        <p className="max-w-2xl text-pretty text-sm leading-6 text-text-secondary">
          {body}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={ROUTE_CONTROL_CLASS_NAME}
        onClick={onRetry}
      >
        {retryLabel}
      </Button>
    </Card>
  );
}

export const daoRouteControlClassName = ROUTE_CONTROL_CLASS_NAME;
