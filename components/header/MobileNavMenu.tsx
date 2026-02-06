"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";
import { IconChevron } from "@/components/icons/IconChevron";
import { IconClose } from "@/components/icons/IconClose";
import { IconDiscord } from "@/components/icons/IconDiscord";
import { IconMoon } from "@/components/icons/IconMoon";
import { IconSun } from "@/components/icons/IconSun";
import { IconTwitter } from "@/components/icons/IconTwitter";
import { IconWallet } from "@/components/icons/IconWallet";
import { LogoGithub } from "@/components/icons/LogoGithub";
import { TypeMarkYearn } from "@/components/icons/TypeMarkYearn";
import { cn } from "@/lib/cn";
import { formatAddress } from "@/lib/format";
import { resolveHeaderPrimaryNav } from "@/lib/header-nav";
import { useHostname } from "@/lib/hooks/useHostname";
import { useTheme } from "@/lib/hooks/useTheme";
import {
  APP_LINKS,
  COMMUNITY,
  INFO_ITEMS,
  PRODUCTS,
  TOOLS,
  type NavItem,
} from "@/lib/nav-data";
import { MobileNavTile } from "./MobileNavTile";

type MobileNavMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TSectionId = "products" | "information" | "community" | "tools";

type TAccordionSection = {
  id: TSectionId;
  title: string;
  items: NavItem[];
};

function getInitialExpandedState(): Record<TSectionId, boolean> {
  return {
    products: false,
    information: false,
    community: false,
    tools: false,
  };
}

const LIST_BUTTON_CLASS =
  "relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 text-left text-lg font-medium text-text-primary transition-colors hover:bg-surface-tertiary";

export function MobileNavMenu({
  isOpen,
  onClose,
}: MobileNavMenuProps): ReactElement | null {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [expandedSections, setExpandedSections] = useState(
    getInitialExpandedState,
  );
  const hostname = useHostname();
  const isDark = theme === "soft-dark";
  const currentAppLabel = resolveHeaderPrimaryNav(pathname, null).label;
  const currentApp = APP_LINKS.find((app) => app.name === currentAppLabel);
  const handleClose = useCallback(() => {
    setExpandedSections(getInitialExpandedState());
    onClose();
  }, [onClose]);

  const accordionSections = useMemo<TAccordionSection[]>(
    () => [
      {
        id: "products",
        title: "Products",
        items: PRODUCTS,
      },
      {
        id: "information",
        title: "Information",
        items: INFO_ITEMS,
      },
      {
        id: "community",
        title: "Community",
        items: COMMUNITY,
      },
      {
        id: "tools",
        title: "Tools",
        items: TOOLS,
      },
    ],
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-app text-text-primary animate-in fade-in slide-in-from-bottom-4 duration-300 md:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <TypeMarkYearn
          className="h-8 w-auto text-yearn-blue dark:text-text-primary"
          color="currentColor"
        />
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Close navigation menu"
        >
          <IconClose className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="flex min-h-[44px] w-full items-center gap-3 rounded-lg bg-primary/10 bg-text-primary/10 px-4 text-text-primary">
              {currentApp?.icon ? (
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center",
                    currentApp.iconWrapperClass,
                  )}
                >
                  {currentApp.icon}
                </span>
              ) : null}
              <span className="truncate text-lg font-medium">{currentAppLabel}</span>
            </div>
            <MobileWalletButton onSelect={handleClose} />
            <button
              type="button"
              onClick={toggleTheme}
              className={LIST_BUTTON_CLASS}
            >
              {isDark ? (
                <IconSun className="size-5 shrink-0" />
              ) : (
                <IconMoon className="size-5 shrink-0" />
              )}
              <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
          </div>

          <div className="space-y-1">
            {accordionSections.map((section) => {
              const isExpanded = expandedSections[section.id];
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((previous) => ({
                        ...previous,
                        [section.id]: !previous[section.id],
                      }))
                    }
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-4 text-left text-lg font-medium text-text-primary transition-colors hover:bg-surface-tertiary"
                    aria-expanded={isExpanded}
                  >
                    <span className="truncate">{section.title}</span>
                    <IconChevron
                      className={cn(
                        "size-5 shrink-0 text-text-secondary transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-out",
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-0.5 px-2 pb-3 pt-1">
                        {section.items.map((item) => (
                          <MobileNavTile
                            key={item.href}
                            item={item}
                            onSelect={handleClose}
                            hostname={hostname}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-6">
        <div className="flex items-center justify-center gap-3">
          <SocialLink href="https://x.com/yearnfi" label="Yearn on X">
            <IconTwitter className="size-5" />
          </SocialLink>
          <SocialLink href="https://github.com/yearn" label="Yearn on Github">
            <LogoGithub className="size-5" />
          </SocialLink>
          <SocialLink href="https://discord.gg/yearn" label="Yearn on Discord">
            <IconDiscord className="size-5" />
          </SocialLink>
        </div>
      </footer>
    </div>
  );
}

function MobileWalletButton({ onSelect }: { onSelect: () => void }): ReactElement {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return <div className="h-[44px] w-full animate-pulse rounded-lg bg-surface-secondary" />;
        }

        if (!connected) {
          return (
            <button
              type="button"
              onClick={() => {
                onSelect();
                openConnectModal?.();
              }}
              className={LIST_BUTTON_CLASS}
            >
              <IconWallet className="size-5 shrink-0" />
              <span className="truncate">Connect Wallet</span>
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={() => {
                onSelect();
                (openChainModal ?? openConnectModal)?.();
              }}
              className="relative flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 text-left text-lg font-medium text-red-500 transition-colors hover:bg-surface-tertiary"
            >
              <IconWallet className="size-5 shrink-0 text-red-500" />
              <span className="truncate">Wrong Network</span>
            </button>
          );
        }

        const identityLabel = account.ensName ?? formatAddress(account.address);

        return (
          <button
            type="button"
            onClick={() => {
              onSelect();
              openAccountModal?.();
            }}
            className={LIST_BUTTON_CLASS}
          >
            <IconWallet className="size-5 shrink-0" />
            <span className="truncate">{identityLabel}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactElement;
}): ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
    >
      {children}
    </a>
  );
}
