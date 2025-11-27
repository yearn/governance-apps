"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  type ReactElement,
  type RefObject,
} from "react";
import { useId } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconChevron } from "@/components/icons/IconChevron";
import { LogoStyfi } from "@/components/icons/LogoStyfi";
import { LogoStyfix } from "@/components/icons/LogoStyfix";
import { cn } from "@/lib/cn";
import { formatTokenAmount } from "@/lib/format";
import { useStyfiAccount } from "@/lib/hooks/useStyfi";
import { Tooltip } from "@/components/ui/Tooltip";
import { styfiCopy as copy } from "../messages";
import { StyfiMode, modeLabel } from "./types";
import { useStyfiMode } from "../state/StyfiModeProvider";

export function StyfiPositionCard() {
  const drawerId = useId();
  const { mode, isDrawerOpen, selectMode, toggleDrawer, quickSwitch } =
    useStyfiMode();
  const { data, isLoading } = useStyfiAccount();

  const styfiCardRef = useRef<HTMLButtonElement>(null);
  const styfixCardRef = useRef<HTMLButtonElement>(null);

  const primaryBalance = useMemo(() => {
    if (!data) return 0n;
    return mode === "styfi" ? data.styfiActive : data.styfiX.assetsActive;
  }, [data, mode]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const target =
      (mode === "styfi" ? styfiCardRef.current : styfixCardRef.current) ??
      styfiCardRef.current ??
      styfixCardRef.current;
    target?.focus();
  }, [isDrawerOpen, mode]);

  const handleSelect = (nextMode: StyfiMode) => {
    selectMode(nextMode, { collapseDrawer: true, markOnboarded: true });
  };

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        isDrawerOpen ? "gap-6" : "gap-0"
      )}
    >
      {/* HEADER ROW */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* ASSET FOCUS GROUP */}
        <div className="flex items-center gap-5">
          {/* Logo Cluster: Handles the Swapping Animation */}
          <LogoCluster mode={mode} onQuickSwitch={quickSwitch} />

          {/* Text / Metadata Group */}
          <div className="space-y-1">
            {/* The Label is now the Trigger for the drawer */}
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
      </div>

      <ModeDrawer
        isOpen={isDrawerOpen}
        drawerId={drawerId}
        styfiCardRef={styfiCardRef}
        styfixCardRef={styfixCardRef}
        mode={mode}
        onSelect={handleSelect}
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
    // Width = 48px (Base) + 16px (Shift) = 64px total to encompass both.
    // Height = 12 (48px).
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
      // Removed disabled={isActive} so clicking the active token also triggers switch
      className={cn(
        "absolute top-0 left-0 rounded-full bg-white p-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2",
        // Using top-left origin makes the math for bottom alignment explicit via translate-y
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

// --- Drawer Components (Unchanged) ---

function ModeDrawer({
  isOpen,
  drawerId,
  styfiCardRef,
  styfixCardRef,
  mode,
  onSelect,
}: {
  isOpen: boolean;
  drawerId: string;
  styfiCardRef: RefObject<HTMLButtonElement | null>;
  styfixCardRef: RefObject<HTMLButtonElement | null>;
  mode: StyfiMode;
  onSelect: (mode: StyfiMode) => void;
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
            ? "border-t border-neutral-200 pt-6 mt-2 opacity-100"
            : "border-t-0 pt-0 opacity-0"
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
          <div className="grid gap-4 md:grid-cols-2">
            <ModeSelectionCard
              ref={styfiCardRef}
              mode="styfi"
              isActive={mode === "styfi"}
              onClick={() => onSelect("styfi")}
            />
            <ModeSelectionCard
              ref={styfixCardRef}
              mode="x"
              isActive={mode === "x"}
              onClick={() => onSelect("x")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const ModeSelectionCard = forwardRef<
  HTMLButtonElement,
  { mode: StyfiMode; isActive: boolean; onClick: () => void }
>(function ModeSelectionCard({ mode, isActive, onClick }, ref) {
  const cardCopy =
    mode === "styfi"
      ? copy.modeSelector.cards.styfi
      : copy.modeSelector.cards.x;
  const Logo = mode === "styfi" ? LogoStyfi : LogoStyfix;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-xl border p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        isActive
          ? "border-2 border-neutral-900 bg-neutral-900/5 shadow-inner"
          : "border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-md hover:-translate-y-0.5"
      )}
      aria-pressed={isActive}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo
            className="h-10 w-10 shadow-sm rounded-full bg-white"
            aria-hidden
          />
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-neutral-900">
              {cardCopy.title}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              {cardCopy.kicker}
            </p>
          </div>
        </div>
        {isActive && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-900 bg-white border border-neutral-200 px-2 py-0.5 rounded-full">
            {copy.modeSelector.activeBadge}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
        {cardCopy.description}
      </p>
    </button>
  );
});
