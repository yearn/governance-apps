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
  className?: string;
  variant?: "pill" | "line";
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = "pill",
}: TabsProps) {
  if (variant === "line") {
    return (
      <div
        className={cn("flex w-full gap-6 border-b border-border", className)}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = !!tab.disabled;
          const button = (
            <button
              onClick={() => {
                if (!isDisabled) onChange(tab.id);
              }}
              disabled={isDisabled}
              className={cn(
                "pb-2 text-sm font-bold transition-all relative",
                isDisabled
                  ? "text-text-secondary/50 cursor-not-allowed pointer-events-none"
                  : isActive
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <div className="flex items-center gap-2">
                {tab.label}
                {tab.badge}
              </div>
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
      className={cn(
        "flex w-fit rounded-lg bg-surface-secondary/60 p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = !!tab.disabled;
        const button = (
          <button
            onClick={() => {
              if (!isDisabled) onChange(tab.id);
            }}
            disabled={isDisabled}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              isDisabled
                ? "text-text-secondary/50 cursor-not-allowed pointer-events-none"
                : isActive
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              {tab.badge}
            </span>
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
