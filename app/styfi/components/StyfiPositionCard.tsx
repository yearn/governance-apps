// app/styfi/components/StyfiPositionCard.tsx

"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useId } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconChevron } from "@/components/icons/IconChevron";
import { IconCheck } from "@/components/icons/IconCheck";
import { IconStar } from "@/components/icons/IconStar";
import { LogoStyfi } from "@/components/icons/LogoStyfi";
import { LogoStyfix } from "@/components/icons/LogoStyfix";
import { cn } from "@/lib/cn";
import { formatTokenAmount } from "@/lib/format";
import { useStyfiAccount } from "@/lib/hooks/useStyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { styfiCopy as copy } from "../messages";
import { StyfiMode, modeLabel } from "./types";
import { useStyfiMode } from "../state/StyfiModeProvider";

const COLLAPSE_DELAY_MS = 650;

export function StyfiPositionCard() {
  const drawerId = useId();
  const { mode, isDrawerOpen, isOnboarded, selectMode, toggleDrawer } =
    useStyfiMode();
  const { data, isLoading } = useStyfiAccount();

  const styfiCardRef = useRef<HTMLButtonElement>(null);
  const styfixCardRef = useRef<HTMLButtonElement>(null);

  const currentApr = copy.page.stats.apr.value;

  const cooldown =
    mode === "styfi" ? data?.styfiCooldown : data?.styfiX.cooldown;
  const { isComplete } = useEpochCountdown(cooldown?.endsAt);

  const balances = useMemo(() => {
    if (!data) return { active: 0n, totalExiting: 0n, isFullyUnlocked: false };

    let active = 0n;
    let inCooldown = 0n;
    let unlocked = 0n;

    if (mode === "styfi") {
      active = data.styfiActive;
      inCooldown = data.styfiInCooldown;
      unlocked = data.styfiUnlocked;
    } else {
      active = data.styfiX.assetsActive;
      inCooldown = data.styfiX.assetsInCooldown;
      unlocked = data.styfiX.assetsUnlocked;
    }

    const totalExiting = inCooldown + unlocked;
    const isFullyUnlocked =
      totalExiting > 0n && (inCooldown === 0n || isComplete);

    return { active, totalExiting, isFullyUnlocked };
  }, [data, mode, isComplete]);

  const {
    active: primaryBalance,
    totalExiting: exitingBalance,
    isFullyUnlocked,
  } = balances;

  const hasExiting = exitingBalance > 0n;
  const hasActive = primaryBalance > 0n;
  const formattedExiting = formatTokenAmount(exitingBalance, 18, 4);

  let balanceLabel = copy.modeSelector.balanceSuffix(modeLabel(mode));

  if (hasExiting) {
    if (hasActive) {
      balanceLabel = isFullyUnlocked
        ? copy.modeSelector.balanceWithExited(formattedExiting)
        : copy.modeSelector.balanceWithExiting(formattedExiting);
    } else {
      balanceLabel = isFullyUnlocked
        ? copy.modeSelector.balanceExitedOnly(formattedExiting)
        : copy.modeSelector.balanceExitingOnly(formattedExiting);
    }
  }

  // Handle focus management when drawer opens
  useEffect(() => {
    if (!isOnboarded) return;
    if (!isDrawerOpen) return;
    const target =
      (mode === "styfi" ? styfiCardRef.current : styfixCardRef.current) ??
      styfiCardRef.current ??
      styfixCardRef.current;

    // Slight delay to allow expansion to start
    setTimeout(() => target?.focus(), 50);
  }, [isDrawerOpen, isOnboarded, mode]);

  const [optimisticMode, setOptimisticMode] = useState<StyfiMode | null>(null);

  const handleSelect = (nextMode: StyfiMode) => {
    setOptimisticMode(nextMode);

    setTimeout(() => {
      selectMode(nextMode, { collapseDrawer: true, markOnboarded: true });
      setTimeout(() => setOptimisticMode(null), 500);
    }, COLLAPSE_DELAY_MS);
  };

  const ActiveLogo = mode === "styfi" ? LogoStyfi : LogoStyfix;

  return (
    <Card className="flex flex-col">
      {/*
         Header: Always visible (except initial onboarding fade-in).
         This section must be rigid.
      */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-in-out",
          isOnboarded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        {/*
           POLISH FIX: p-1 -m-1 creates a buffer zone for the overflow clip.
           This ensures the Logo transform (scale-105) doesn't get clipped at the left edge,
           while maintaining perfect visual alignment with the rest of the UI.
        */}
        <div className="overflow-hidden p-1 -m-1">
          <div
            className={cn(
              // Negative margins on the button allow it to "bleed" to the edge
              // of the Card padding for hover states, while keeping text aligned.
              "pb-1",
              isOnboarded
                ? "opacity-100 transition-opacity duration-700 delay-100"
                : "opacity-0"
            )}
          >
            <button
              type="button"
              onClick={toggleDrawer}
              className="group w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-lg -ml-2 -mr-2 pl-2 py-2 pr-2 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-expanded={isDrawerOpen}
              aria-controls={drawerId}
              aria-label={
                isDrawerOpen
                  ? copy.modeSelector.compareAria.collapse
                  : copy.modeSelector.compareAria.expand
              }
            >
              <div
                key={mode}
                className="flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
              >
                <ActiveLogo className="h-12 w-12 shrink-0 transition-transform duration-300 group-hover:scale-105" />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-500 group-hover:text-neutral-900 transition-colors">
                      {copy.modeSelector.kicker}
                    </span>
                    <IconChevron
                      className={cn(
                        "h-3 w-3 text-neutral-400 transition-transform duration-300 group-hover:text-neutral-900",
                        isDrawerOpen && "rotate-180"
                      )}
                    />
                  </div>

                  {isLoading ? (
                    <Skeleton className="h-8 w-40" />
                  ) : data ? (
                    <div className="flex flex-wrap items-baseline gap-2 text-neutral-900">
                      <span className="text-2xl font-number font-bold">
                        {formatTokenAmount(primaryBalance, 18, 4)} YFI
                      </span>
                      <span className="text-sm font-semibold text-neutral-600">
                        {balanceLabel}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">
                      {copy.modeSelector.disconnected}
                    </p>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "hidden md:block text-right transition-all duration-300",
                  isDrawerOpen
                    ? "opacity-0 translate-y-2" // Push down when exiting/hidden
                    : "opacity-100 translate-y-0" // Rise up when appearing
                )}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Current APR
                </p>
                <p className="text-xl font-number font-bold text-neutral-900">
                  {currentApr}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <ModeDrawer
        isOpen={isDrawerOpen}
        drawerId={drawerId}
        styfiCardRef={styfiCardRef}
        styfixCardRef={styfixCardRef}
        mode={mode}
        onSelect={handleSelect}
        aprValue={currentApr}
        isOnboarded={isOnboarded}
        optimisticMode={optimisticMode}
      />
    </Card>
  );
}

function ModeDrawer({
  isOpen,
  drawerId,
  styfiCardRef,
  styfixCardRef,
  mode,
  onSelect,
  aprValue,
  isOnboarded,
  optimisticMode,
}: {
  isOpen: boolean;
  drawerId: string;
  styfiCardRef: RefObject<HTMLButtonElement | null>;
  styfixCardRef: RefObject<HTMLButtonElement | null>;
  mode: StyfiMode;
  onSelect: (mode: StyfiMode) => void;
  aprValue: string;
  isOnboarded: boolean;
  optimisticMode: StyfiMode | null;
}) {
  return (
    <div
      id={drawerId}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows]",
        isOpen
          ? "grid-rows-[1fr] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
          : "grid-rows-[0fr] duration-300 ease-in-out"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "space-y-6",
            isOnboarded ? "pt-6 mt-2 border-t border-neutral-200" : "pt-0 mt-0"
          )}
        >
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-900">
              {copy.modeSelector.drawer.title}
            </h3>
            <p className="text-sm text-neutral-600 max-w-lg">
              {copy.modeSelector.drawer.body}
            </p>
          </div>

          <Banner variant="info" title={copy.modeSelector.voteBanner.title}>
            {copy.modeSelector.voteBanner.body}
          </Banner>

          <div className="grid gap-4 md:grid-cols-2">
            <div
              className={
                !isOnboarded
                  ? "animate-in fade-in slide-in-from-top-4 duration-700 fill-mode-backwards"
                  : undefined
              }
            >
              <ModeSelectionCard
                ref={styfiCardRef}
                mode="styfi"
                isActive={
                  optimisticMode === "styfi" ||
                  (!optimisticMode && isOnboarded && mode === "styfi")
                }
                onClick={() => onSelect("styfi")}
                aprValue={aprValue}
                aprType="Variable"
              />
            </div>

            <div
              className={
                !isOnboarded
                  ? "animate-in fade-in slide-in-from-top-4 duration-700 delay-150 fill-mode-backwards"
                  : undefined
              }
            >
              <ModeSelectionCard
                ref={styfixCardRef}
                mode="x"
                isActive={
                  optimisticMode === "x" ||
                  (!optimisticMode && isOnboarded && mode === "x")
                }
                onClick={() => onSelect("x")}
                aprValue={aprValue}
                aprType="Maximized"
                isRecommended={true}
                showPulse={!isOnboarded}
              />
            </div>
          </div>
          <div className="h-1" />
        </div>
      </div>
    </div>
  );
}

const ModeSelectionCard = forwardRef<
  HTMLButtonElement,
  {
    mode: StyfiMode;
    isActive: boolean;
    onClick: () => void;
    aprValue: string;
    aprType: string;
    isRecommended?: boolean;
    showPulse?: boolean;
  }
>(function ModeSelectionCard(
  { mode, isActive, onClick, aprValue, aprType, isRecommended, showPulse },
  ref
) {
  const cardCopy =
    mode === "styfi"
      ? copy.modeSelector.cards.styfi
      : copy.modeSelector.cards.x;
  const Logo = mode === "styfi" ? LogoStyfi : LogoStyfix;

  const baseClasses =
    "h-full flex flex-col group w-full rounded-xl p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2";

  if (isActive) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          baseClasses,
          "border-2 border-neutral-900 bg-neutral-900/5 shadow-inner"
        )}
        aria-pressed={true}
      >
        <CardContent
          Logo={Logo}
          cardCopy={cardCopy}
          aprValue={aprValue}
          aprType={aprType}
          badge={
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-neutral-900 border border-neutral-900 bg-transparent px-1.5 py-0.5 rounded-full">
              <IconCheck className="w-3 h-3" />
              {copy.modeSelector.activeBadge}
            </span>
          }
        />
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        baseClasses,
        "border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-md hover:-translate-y-0.5",
        isRecommended && !isActive && "border-neutral-200"
      )}
      aria-pressed={false}
    >
      <CardContent
        Logo={Logo}
        cardCopy={cardCopy}
        aprValue={aprValue}
        aprType={aprType}
        badge={
          isRecommended ? (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-yearn-blue border border-yearn-blue bg-transparent px-1.5 py-0.5 rounded-full",
                showPulse && "animate-pulse"
              )}
            >
              <IconStar className="w-3 h-3 fill-yearn-blue" />
              Recommended
            </span>
          ) : null
        }
      />
    </button>
  );
});

function CardContent({
  Logo,
  cardCopy,
  aprValue,
  aprType,
  badge,
}: {
  Logo: React.ElementType;
  cardCopy: { title: string; kicker: string; description: string };
  aprValue: string;
  aprType: string;
  badge: React.ReactNode;
}) {
  return (
    <>
      <div className="w-full flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" aria-hidden />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-neutral-900">
                {cardCopy.title}
              </p>
              {badge}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              {cardCopy.kicker}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-number font-bold text-neutral-900 leading-none">
            {aprValue}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 mt-1">
            {aprType} APR
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-neutral-600 leading-relaxed pr-2 grow">
        {cardCopy.description}
      </p>
    </>
  );
}
