"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface Tab {
  id: string;
  label: string;
  badge?: React.ReactNode;
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
      <div className={cn("flex gap-6 border-b border-neutral-200 w-full", className)}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "pb-2 text-sm font-bold transition-all relative",
                isActive
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <div className="flex items-center gap-2">
                {tab.label}
                {tab.badge}
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn("flex p-1 bg-neutral-200/50 rounded-lg w-fit", className)}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              isActive
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
