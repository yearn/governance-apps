"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
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
import { styfiCopy as copy } from "../messages";
import { StyfiMode, modeLabel } from "./types";
import { useStyfiMode } from "../state/StyfiModeProvider";

const COLLAPSE_DELAY_MS = 650;

export function StyfiPositionCard() {
  const drawerId = useId();
  const {
    mode,
    isDrawerOpen,
    isOnboarded,
    selectMode,
    toggleDrawer,
    quickSwitch,
  } = useStyfiMode();
  const { data, isLoading } = useStyfiAccount();

  const styfiCardRef = useRef<HTMLButtonElement>(null);
  const styfixCardRef = useRef<HTMLButtonElement>(null);

  const currentApr = copy.page.stats.apr.value;

  const primaryBalance = useMemo(() => {
    if (!data) return 0n;
    return mode === "styfi" ? data.styfiActive : data.styfiX.assetsActive;
  }, [data, mode]);

  // Handle focus management when drawer opens
  useEffect(() => {
    if (!isOnboarded) return;
    if (!isDrawerOpen) return;
    const target =
      (mode === "styfi" ? styfiCardRef.current : styfixCardRef.current) ??
      styfiCardRef.current ??
      styfixCardRef.current;
    target?.focus();
  }, [isDrawerOpen, isOnboarded, mode]);

  // Local state for "Optimistic" selection feedback
  const [optimisticMode, setOptimisticMode] = useState<StyfiMode | null>(null);

  const handleSelect = (nextMode: StyfiMode) => {
    // 1. Immediate visual feedback (Selection State turns Gray)
    setOptimisticMode(nextMode);

    // 2. Pause to let the user register the selection
    setTimeout(() => {
      // 3. Commit to global state (Triggers Header Entry + Drawer Collapse)
      selectMode(nextMode, { collapseDrawer: true, markOnboarded: true });

      // Cleanup local state after the transition is settled
      setTimeout(() => setOptimisticMode(null), 500);
    }, COLLAPSE_DELAY_MS);
  };

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        isDrawerOpen && isOnboarded ? "gap-6" : "gap-0"
      )}
    >
      {/* HEADER ROW - Only visible after onboarding */}
      {isOnboarded && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-top-4 duration-700 fill-mode-backwards">
          <div className="flex items-center gap-5">
            <LogoCluster mode={mode} onQuickSwitch={quickSwitch} />

            <div className="space-y-1">
              <button
                type="button"
                onClick={toggleDrawer}
                className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500 hover:text-neutral-900 transition-colors focus:outline-none"
                aria-expanded={isDrawerOpen}
                aria-controls={drawerId}
              >
                {copy.modeSelector.kicker}
                <IconChevron
                  className={cn(
                    "h-3 w-3 text-neutral-400 transition-transform duration-300 group-hover:text-neutral-900",
                    isDrawerOpen && "rotate-180"
                  )}
                />
              </button>

              {isLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : data ? (
                <div className="flex flex-wrap items-baseline gap-2 text-neutral-900">
                  <span className="text-2xl font-number font-bold">
                    {formatTokenAmount(primaryBalance, 18, 4)} YFI
                  </span>
                  <span className="text-sm font-semibold text-neutral-600">
                    {copy.modeSelector.balanceSuffix(modeLabel(mode))}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-neutral-600">
                  {copy.modeSelector.disconnected}
                </p>
              )}
            </div>
          </div>

          {!isDrawerOpen && (
            <div className="hidden md:block text-right animate-in fade-in duration-300">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Current APR
              </p>
              <p className="text-xl font-number font-bold text-neutral-900">
                {currentApr}
              </p>
            </div>
          )}
        </div>
      )}

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

function LogoCluster({
  mode,
  onQuickSwitch,
}: {
  mode: StyfiMode;
  onQuickSwitch: () => void;
}) {
  const logos: {
    mode: StyfiMode;
    Logo: (props: React.SVGProps<SVGSVGElement>) => ReactElement;
  }[] = [
    { mode: "styfi", Logo: LogoStyfi },
    { mode: "x", Logo: LogoStyfix },
  ];

  return (
    <div className="relative h-12 w-16">
      {logos.map(({ mode: logoMode, Logo }) => {
        const isActive = mode === logoMode;
        return (
          <LogoButton
            key={logoMode}
            onClick={onQuickSwitch}
            Logo={Logo}
            label={
              isActive
                ? `Current mode: ${modeLabel(logoMode)}`
                : copy.modeSelector.switchAria(modeLabel(logoMode))
            }
            isActive={isActive}
          />
        );
      })}
    </div>
  );
}

function LogoButton({
  onClick,
  Logo,
  label,
  isActive,
}: {
  onClick?: () => void;
  Logo: (props: React.SVGProps<SVGSVGElement>) => ReactElement;
  label: string;
  isActive: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-0 left-0 rounded-full bg-white p-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2",
        "origin-top-left",
        isActive
          ? "z-20 translate-x-4 translate-y-0 scale-100 shadow-sm opacity-100"
          : "z-10 translate-x-0 translate-y-2 scale-75 opacity-60 grayscale hover:opacity-100 hover:scale-90 hover:grayscale-0 hover:translate-y-0.5 hover:-translate-x-4 cursor-pointer shadow-none"
      )}
      aria-label={label}
    >
      <Logo className="h-12 w-12" aria-hidden />
    </button>
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
        "grid overflow-hidden transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen
            ? isOnboarded
              ? "border-t border-neutral-200 pt-6 mt-2 opacity-100"
              : "border-t-0 pt-0 mt-0 opacity-100"
            : "border-t-0 pt-0 mt-0 opacity-0"
        )}
      >
        <div className="space-y-6">
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
            {/* WRAPPER 1: stYFI Card (Slides in from Top) */}
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

            {/* WRAPPER 2: stYFIx Card (Slides in from Top, Delayed) */}
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
                aprType="Max"
                isRecommended={true}
                showPulse={!isOnboarded}
              />
            </div>
          </div>
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

  // VISUAL LOGIC

  // 1. Selected State
  if (isActive) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="h-full flex flex-col group w-full rounded-xl p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 border-2 border-neutral-900 bg-neutral-900/5 shadow-inner"
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

  // 2. Recommended (Unselected) State
  if (isRecommended) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="h-full flex flex-col group w-full rounded-xl p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-md hover:-translate-y-0.5"
        aria-pressed={false}
      >
        <CardContent
          Logo={Logo}
          cardCopy={cardCopy}
          aprValue={aprValue}
          aprType={aprType}
          badge={
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-yearn-blue border border-yearn-blue bg-transparent px-1.5 py-0.5 rounded-full",
                showPulse && "animate-pulse"
              )}
            >
              <IconStar className="w-3 h-3 fill-yearn-blue" />
              Recommended
            </span>
          }
        />
      </button>
    );
  }

  // 3. Standard (Unselected) State
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="h-full flex flex-col group w-full rounded-xl p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-md hover:-translate-y-0.5"
      aria-pressed={false}
    >
      <CardContent
        Logo={Logo}
        cardCopy={cardCopy}
        aprValue={aprValue}
        aprType={aprType}
        badge={null}
      />
    </button>
  );
});

// Helper to keep content consistent across the 3 states
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
          <Logo
            className="h-10 w-10 shadow-sm rounded-full bg-white"
            aria-hidden
          />
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
            APR {aprType}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-neutral-600 leading-relaxed pr-2 grow">
        {cardCopy.description}
      </p>
    </>
  );
}
