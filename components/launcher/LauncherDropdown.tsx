"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { APP_GROUPS, SOCIAL_LINKS, type AppTile } from "@/components/launcher/AppData";
import { DropdownPanel } from "@/components/launcher/DropdownPanel";
import { IconChevron } from "@/components/icons/IconChevron";
import { cn } from "@/lib/cn";

function Link({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function findGroupItems(title: string): AppTile[] {
  return APP_GROUPS.find((group) => group.title === title)?.items ?? [];
}

const APPS = findGroupItems("Apps");
const TOOLS = findGroupItems("Analytics and Tools");
const RESOURCES = findGroupItems("Resources");
const DEPRECATED = findGroupItems("Deprecated Projects");

function AppTileCard({ item }: { item: AppTile }): ReactElement {
  return (
    <Link href={item.href}>
      <div className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-secondary">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary">
          {item.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-text-primary">
              {item.name}
            </span>
            {isExternalHref(item.href) && (
              <span className="text-xs text-text-tertiary">↗</span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-text-secondary">{item.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function LinkItem({ item }: { item: AppTile }): ReactElement {
  return (
    <Link href={item.href}>
      <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary">
        <span>{item.name}</span>
        {isExternalHref(item.href) && <span className="text-xs">↗</span>}
      </div>
    </Link>
  );
}

type LauncherDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LauncherDropdown({
  isOpen,
  onClose,
}: LauncherDropdownProps): ReactElement | null {
  const [isDeprecatedExpanded, setIsDeprecatedExpanded] = useState(false);

  const sectionHeaderClass =
    "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary";

  return (
    <DropdownPanel
      isOpen={isOpen}
      onClose={onClose}
      anchor="left"
      className="w-[420px] max-md:w-full"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className={sectionHeaderClass}>Apps</h3>
          <div className="grid grid-cols-2 gap-1">
            {APPS.map((item) => (
              <div key={item.href} onClick={onClose}>
                <AppTileCard item={item} />
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className={sectionHeaderClass}>Tools</h3>
            <div className="flex flex-col">
              {TOOLS.map((item) => (
                <div key={item.href} onClick={onClose}>
                  <LinkItem item={item} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className={sectionHeaderClass}>Resources</h3>
            <div className="flex flex-col">
              {RESOURCES.map((item) => (
                <div key={item.href} onClick={onClose}>
                  <LinkItem item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsDeprecatedExpanded(!isDeprecatedExpanded)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary"
            >
              <span>Deprecated</span>
              <IconChevron
                className={cn(
                  "h-3 w-3 transition-transform",
                  isDeprecatedExpanded ? "rotate-180" : ""
                )}
              />
            </button>

            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary">
                    {link.icon}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {isDeprecatedExpanded && (
            <div className="mt-2 flex flex-wrap gap-x-1">
              {DEPRECATED.map((item) => (
                <div key={item.href} onClick={onClose}>
                  <LinkItem item={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DropdownPanel>
  );
}
