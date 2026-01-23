"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

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
  const ref = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full mt-2 rounded-2xl border border-border bg-surface p-4 shadow-xl z-50",
        "max-md:fixed max-md:inset-x-0 max-md:top-16 max-md:mt-0 max-md:rounded-none max-md:border-x-0 max-md:border-t",
        anchor === "left" ? "left-0" : "right-0",
        className
      )}
    >
      {children}
    </div>
  );
}
