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

  const activeCardCopy =
    mode === "styfi"
      ? copy.modeSelector.cards.styfi
      : copy.modeSelector.cards.x;
  const secondaryMode: StyfiMode = mode === "styfi" ? "x" : "styfi";

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
    <Card className={cn("flex flex-col", isDrawerOpen ? "gap-4" : "gap-0")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <LogoCluster
            mode={mode}
            onQuickSwitch={quickSwitch}
          />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              {copy.modeSelector.kicker}
            </p>
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

        <button
          type="button"
          onClick={toggleDrawer}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2"
          aria-expanded={isDrawerOpen}
          aria-controls={drawerId}
          aria-label={
            isDrawerOpen
              ? copy.modeSelector.compareAria.collapse
              : copy.modeSelector.compareAria.expand
          }
        >
          {copy.modeSelector.compareLabel}
          <span
            className={cn(
              "rounded-full border border-neutral-300 p-1 transition-transform duration-200 group-hover:border-neutral-500",
              isDrawerOpen && "rotate-180"
            )}
          >
            <IconChevron className="h-4 w-4" />
          </span>
        </button>
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
        "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "border-t border-neutral-200 pt-4 mt-2" : "border-t-0 pt-0"
        )}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-900">
              {copy.modeSelector.drawer.title}
            </p>
            <p className="text-sm text-neutral-600">
              {copy.modeSelector.drawer.body}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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
        "group w-full rounded-xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        isActive
          ? "border-2 border-neutral-900 bg-neutral-900/5 shadow-sm"
          : "border border-neutral-200 bg-white hover:border-neutral-400"
      )}
      aria-pressed={isActive}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-900">
              {cardCopy.title}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              {cardCopy.kicker}
            </p>
          </div>
        </div>
        {isActive ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">
            {copy.modeSelector.activeBadge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-neutral-600">{cardCopy.description}</p>
    </button>
  );
});

function LogoCluster({ mode, onQuickSwitch }: { mode: StyfiMode; onQuickSwitch: () => void }) {
  const logos: { mode: StyfiMode; Logo: (props: React.SVGProps<SVGSVGElement>) => ReactElement }[] =
    [
      { mode: "styfi", Logo: LogoStyfi },
      { mode: "x", Logo: LogoStyfix },
    ];

  return (
    <div className="relative h-14 w-[120px]">
      {logos.map(({ mode: logoMode, Logo }) => {
        const isActive = mode === logoMode;
        return (
          <LogoButton
            key={logoMode}
            onClick={onQuickSwitch}
            Logo={Logo}
            label={copy.modeSelector.switchAria(modeLabel(logoMode))}
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
  onClick: () => void;
  Logo: (props: React.SVGProps<SVGSVGElement>) => ReactElement;
  label: string;
  isActive: boolean;
}) {
  return (
    <Tooltip content="Switch modes">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "absolute bottom-0 left-1/2 flex h-12 w-12 -translate-x-1/2 items-end justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2",
          isActive
            ? "z-20 translate-x-4 scale-100 shadow-lg"
            : "z-10 -translate-x-4 scale-90 grayscale brightness-90 opacity-85"
        )}
        style={{ transformOrigin: "center bottom" }}
        aria-label={label}
      >
        <Logo
          className={cn(
            "pointer-events-none relative transition-transform duration-200 ease-out",
            isActive ? "h-12 w-12" : "h-12 w-12"
          )}
          aria-hidden
        />
      </button>
    </Tooltip>
  );
}
