"use client";

import Link from "next/link";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { cn } from "@/lib/cn";
import { isExternalHref, type NavItem } from "@/lib/nav-data";

type MobileNavTileProps = {
  item: NavItem;
  onSelect?: () => void;
  className?: string;
};

export function MobileNavTile({
  item,
  onSelect,
  className,
}: MobileNavTileProps) {
  const isExternal = isExternalHref(item.href);
  const hasIcon = Boolean(item.icon);
  const iconWrapperClass =
    item.iconWrapperClass ??
    "bg-white text-neutral-700 dark:bg-[#0a0a0a] dark:text-neutral-200";

  return (
    <div onClick={onSelect}>
      <Link
        href={item.href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-secondary",
          className,
        )}
      >
        {hasIcon && (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              iconWrapperClass,
            )}
          >
            {item.icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-text-primary">
              {item.name}
            </span>
            {isExternal && (
              <IconLinkOut className="size-3 shrink-0 text-text-tertiary opacity-60 transition-opacity group-hover:opacity-100" />
            )}
          </div>
          <p className="truncate text-xs text-text-secondary">
            {item.description}
          </p>
        </div>
      </Link>
    </div>
  );
}
