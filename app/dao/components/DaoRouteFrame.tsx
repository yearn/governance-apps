import type { ReactNode } from "react";
import Link from "next/link";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { Card } from "@/components/ui/Card";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { daoCopy } from "../messages";

type DaoRouteFrameProps = {
  children: ReactNode;
  current: "proposals" | "propose";
};

const ROUTE_CONTROL_CLASS_NAME =
  "h-11 motion-reduce:transition-none motion-reduce:active:scale-100";

export function DaoRouteFrame({ children, current }: DaoRouteFrameProps) {
  return (
    <div className="min-w-0 bg-app text-text-primary">
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-8 md:px-6 md:py-10">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-balance text-3xl font-bold md:text-5xl">
              {daoCopy.app.name}
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-7 text-text-secondary">
              {daoCopy.app.description}
            </p>
          </div>

          <nav
            aria-label={daoCopy.app.name}
            className="mt-6 flex min-w-0 flex-wrap items-center gap-2"
          >
            <Link
              href={daoCopy.app.route}
              aria-current={current === "proposals" ? "page" : undefined}
              className={getButtonClassName({
                variant: "secondary",
                size: "sm",
                className: cn(
                  ROUTE_CONTROL_CLASS_NAME,
                  current === "proposals" &&
                    "border-text-primary bg-surface-secondary"
                ),
              })}
            >
              {daoCopy.navigation.proposals}
            </Link>
            <Link
              href="/dao/propose"
              aria-current={current === "propose" ? "page" : undefined}
              className={getButtonClassName({
                size: "sm",
                className: ROUTE_CONTROL_CLASS_NAME,
              })}
            >
              {daoCopy.navigation.createProposal}
            </Link>
            <a
              href={daoCopy.navigation.forumHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={daoCopy.navigation.forumAccessibleLabel}
              className={getButtonClassName({
                variant: "ghost",
                size: "sm",
                className: cn(ROUTE_CONTROL_CLASS_NAME, "gap-1.5"),
              })}
            >
              <span>{daoCopy.navigation.forum}</span>
              <IconLinkOut className="size-3.5" aria-hidden />
            </a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto min-w-0 space-y-5 px-4 py-8 md:px-6 md:py-10">
        {children}
      </div>
    </div>
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
