"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DropdownPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  anchor?: "left" | "right";
  className?: string;
  children: ReactNode;
};

export function DropdownPanel({
  isOpen,
  onClose,
  anchor = "left",
  className,
  children,
}: DropdownPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full mt-2 rounded-2xl border border-border bg-surface p-4 shadow-xl z-[60]",
        "max-md:fixed max-md:inset-x-0 max-md:top-[var(--header-height)] max-md:mt-0 max-md:rounded-none max-md:border-x-0 max-md:border-t",
        anchor === "left" ? "left-0" : "right-0",
        className
      )}
    >
      {children}
    </div>
  );
}
