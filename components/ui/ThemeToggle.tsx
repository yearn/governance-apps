"use client";

import { useTheme } from "@/lib/hooks/useTheme";
import { IconSun } from "@/components/icons/IconSun";
import { IconMoon } from "@/components/icons/IconMoon";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "soft-dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200",
        "text-text-secondary hover:text-text-primary hover:bg-surface-secondary",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app",
        className,
      )}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <IconSun className="size-4" />
      ) : (
        <IconMoon className="size-4" />
      )}
    </button>
  );
}
