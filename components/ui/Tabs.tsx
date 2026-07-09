"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/ui/Tooltip";

export interface Tab {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  tooltip?: React.ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  getPanelId?: (id: string) => string;
  getTabId?: (id: string) => string;
  "aria-label"?: string;
  className?: string;
  variant?: "pill" | "line";
}

function TabContent({ tab }: { tab: Tab }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{tab.label}</span>
      {tab.badge ? <span className="inline-flex items-center">{tab.badge}</span> : null}
    </span>
  );
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  getPanelId,
  getTabId,
  "aria-label": ariaLabel,
  className,
  variant = "pill",
}: TabsProps) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    if (enabledTabs.length === 0) return;

    const currentIndex = enabledTabs.findIndex((tab) => tab.id === activeTab);
    const lastIndex = enabledTabs.length - 1;
    let nextIndex = currentIndex >= 0 ? currentIndex : 0;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex >= lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = enabledTabs[nextIndex];
    if (!nextTab) return;
    onChange(nextTab.id);
    const refIndex = tabs.findIndex((tab) => tab.id === nextTab.id);
    tabRefs.current[refIndex]?.focus();
  };

  if (variant === "line") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full gap-5 overflow-x-auto border-b border-border",
          className
        )}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isDisabled = !!tab.disabled;
          const panelId = getPanelId?.(tab.id);
          const tabId = getTabId?.(tab.id);
          const button = (
            <button
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={isActive}
              aria-disabled={isDisabled || undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (!isDisabled) onChange(tab.id);
              }}
              onKeyDown={handleKeyDown}
              disabled={isDisabled}
              className={cn(
                "relative inline-flex min-h-10 shrink-0 items-center pb-2 pt-2 text-sm font-bold transition-[color] duration-150 ease-out",
                isDisabled
                  ? "text-text-secondary/50 cursor-not-allowed pointer-events-none"
                  : isActive
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <TabContent tab={tab} />
              {isActive && !isDisabled && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary" />
              )}
            </button>
          );

          return (
            <span
              key={tab.id}
              className={cn("inline-flex", isDisabled && "cursor-not-allowed")}
            >
              {tab.tooltip ? (
                <Tooltip content={tab.tooltip} side={tab.tooltipSide}>
                  <span className="inline-flex">{button}</span>
                </Tooltip>
              ) : (
                button
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-fit rounded-lg bg-surface-secondary/60 p-1",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const isDisabled = !!tab.disabled;
        const panelId = getPanelId?.(tab.id);
        const tabId = getTabId?.(tab.id);
        const button = (
          <button
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={tabId}
            type="button"
            role="tab"
            aria-controls={panelId}
            aria-selected={isActive}
            aria-disabled={isDisabled || undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              if (!isDisabled) onChange(tab.id);
            }}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            className={cn(
              "min-h-10 px-4 py-1.5 text-sm font-medium rounded-md transition-[background-color,color,box-shadow] duration-150 ease-out",
              isDisabled
                ? "text-text-secondary/50 cursor-not-allowed pointer-events-none"
                : isActive
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <TabContent tab={tab} />
          </button>
        );

        return (
          <span
            key={tab.id}
            className={cn("inline-flex", isDisabled && "cursor-not-allowed")}
          >
            {tab.tooltip ? (
              <Tooltip content={tab.tooltip} side={tab.tooltipSide}>
                <span className="inline-flex">{button}</span>
              </Tooltip>
            ) : (
              button
            )}
          </span>
        );
      })}
    </div>
  );
}
