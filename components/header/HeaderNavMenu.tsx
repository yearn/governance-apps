"use client";

import { useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import { IconChevron } from "@/components/icons/IconChevron";
import { IconDiscord } from "@/components/icons/IconDiscord";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { IconTwitter } from "@/components/icons/IconTwitter";
import { LogoGithub } from "@/components/icons/LogoGithub";
import { LogoYearn } from "@/components/icons/LogoYearn";
import { LogoYearnMark } from "@/components/icons/LogoYearnMark";
import { LogoCuration } from "@/components/icons/LogoCuration";
import { DropdownPanel } from "./DropdownPanel";
import { cn } from "@/lib/cn";

type TMenuKey = "products" | "resources";

type TNavTile = {
  name: string;
  href: string;
  description: string;
  icon?: ReactElement;
  iconWrapperClass?: string;
};

const BASE_YEARN_ASSET_URI = "https://assets.yearn.fi";

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function NavTile({ item }: { item: TNavTile }): ReactElement {
  const hasIcon = Boolean(item.icon);
  const isExternal = isExternalHref(item.href);
  const iconWrapperClass =
    item.iconWrapperClass ??
    "bg-white text-neutral-700 dark:bg-[#0a0a0a] dark:text-neutral-200";

  return (
    <Link
      href={item.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      <div
        className={cn(
          "group/nav-item flex items-center rounded-lg p-2 transition-colors",
          hasIcon ? "gap-3" : "gap-0",
          "hover:bg-surface-secondary",
        )}
      >
        {hasIcon && (
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              iconWrapperClass,
            )}
          >
            {item.icon}
          </div>
        )}
        <div className={cn("flex-1", hasIcon ? "" : "pl-1")}>
          <div className="flex w-full items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-text-primary">
              {item.name}
            </span>
            {isExternal && (
              <IconLinkOut className="size-3 opacity-0 transition-opacity group-hover/nav-item:opacity-100 text-text-tertiary" />
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

export function HeaderNavMenu(): ReactElement {
  const [activeMenu, setActiveMenu] = useState<TMenuKey | null>(null);
  const [pinnedMenu, setPinnedMenu] = useState<TMenuKey | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const neutralImageClass =
    "size-5 grayscale opacity-90 dark:invert dark:brightness-125";
  const neutralIconForeground = "text-neutral-700 dark:text-white";

  const products: TNavTile[] = [
    {
      name: "yVaults",
      href: "https://yearn.fi/vaults",
      description: "Yield-Generating Vaults",
      icon: <LogoYearnMark className="size-6 text-yearn-blue" />,
    },
    {
      name: "Curation",
      href: "https://app.morpho.org/ethereum/earn?v2=false&curators=yearn",
      description: "Lending Market Curation",
      icon: (
        <LogoCuration
          className="size-11"
          back="text-transparent"
          front="text-yearn-blue"
        />
      ),
    },
    {
      name: "yCRV",
      href: "https://ycrv.yearn.fi",
      description: "veCRV Liquid Locker",
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="yCRV"
          className="size-6"
          src={`${BASE_YEARN_ASSET_URI}/tokens/1/0xfcc5c47be19d06bf83eb04298b026f81069ff65b/logo-128.png`}
        />
      ),
    },
    {
      name: "yYB",
      href: "https://yyb.yearn.fi",
      description: "veYB Liquid Locker",
      icon: <img alt="yYB" className="size-6" src="/yYB-logo.svg" />,
    },
    {
      name: "stYFI",
      href: "/styfi",
      description: "YFI Staking",
      icon: <img alt="stYFI" className="size-6" src="/tokens/styfi.svg" />,
    },
  ];

  const infoItems: TNavTile[] = [
    {
      name: "Docs",
      href: "https://docs.yearn.fi/",
      description: "Yearn Knowledge Base",
      icon: (
        <img
          alt="GitBook"
          className={neutralImageClass}
          src="/GitBook - Icon - Dark.svg"
        />
      ),
    },
    {
      name: "X (Twitter)",
      href: "https://x.com/yearnfi",
      description: "Official Yearn News Feed",
      icon: <IconTwitter className={cn("size-5", neutralIconForeground)} />,
    },
    {
      name: "Github",
      href: "https://github.com/yearn",
      description: "Yearn Codebase",
      icon: <LogoGithub className={cn("size-5", neutralIconForeground)} />,
    },
    {
      name: "Blog",
      href: "https://blog.yearn.fi/",
      description: "Articles about Yearn",
      icon: (
        <img alt="Blog" className={neutralImageClass} src="/paragraph.svg" />
      ),
    },
    {
      name: "Brand Assets",
      href: "https://brand.yearn.fi",
      description: "Yearn Brand Resources",
      icon: (
        <LogoYearn
          width={20}
          height={20}
          className="size-5"
          back="text-neutral-700 dark:text-neutral-200"
          front="text-white"
        />
      ),
    },
  ];

  const toolItems: TNavTile[] = [
    {
      name: "PowerGlove",
      href: "https://powerglove.yearn.fi",
      description: "Vault Analytics",
    },
    {
      name: "Kong",
      href: "https://kong.yearn.fi",
      description: "Vault Data",
    },
    {
      name: "Kalani",
      href: "https://kalani.yearn.fi",
      description: "Vault Management Interface",
    },
    {
      name: "yFactory",
      href: "https://factory.yearn.fi",
      description: "LP token Vault Creation",
    },
    {
      name: "APR Oracle",
      href: "https://oracle.yearn.fi",
      description: "Projected Vault APY Tool",
    },
  ];

  const communityItems: TNavTile[] = [
    {
      name: "Support",
      href: "https://discord.gg/yearn",
      description: "Yearn Discord Server",
      icon: <IconDiscord className={cn("size-5", neutralIconForeground)} />,
    },
    {
      name: "Governance",
      href: "https://gov.yearn.fi/",
      description: "Yearn Discussion Forum",
      icon: (
        <img
          alt="Discourse"
          className={neutralImageClass}
          src="/discourse-icon.svg"
        />
      ),
    },
  ];

  function navTriggerClass(isActive: boolean): string {
    return cn(
      "cursor-pointer inline-flex items-center gap-1 transition-colors relative",
      isActive
        ? "text-text-primary"
        : "text-text-secondary hover:text-text-primary",
    );
  }

  const openMenu = (menuKey: TMenuKey): void => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveMenu(menuKey);
  };

  const scheduleClose = (): void => {
    if (pinnedMenu) return;
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const toggleMenu = (menuKey: TMenuKey): void => {
    if (pinnedMenu === menuKey) {
      setPinnedMenu(null);
      setActiveMenu(null);
      return;
    }
    setPinnedMenu(menuKey);
    setActiveMenu(menuKey);
  };

  const closeMenu = (): void => {
    setActiveMenu(null);
    setPinnedMenu(null);
  };

  const handleHoverMenu = (menuKey: TMenuKey): void => {
    if (pinnedMenu && pinnedMenu !== menuKey) {
      setPinnedMenu(null);
    }
    openMenu(menuKey);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative"
        onMouseEnter={() => handleHoverMenu("products")}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onClick={() => toggleMenu("products")}
          className={cn("group", navTriggerClass(activeMenu === "products"))}
          aria-expanded={activeMenu === "products"}
        >
          <span>Ecosystem</span>
          <IconChevron
            className={cn(
              "size-3 transition-transform group-hover:rotate-180",
              activeMenu === "products" ? "rotate-180" : "",
            )}
          />
        </button>
        <DropdownPanel
          isOpen={activeMenu === "products"}
          onClose={closeMenu}
          anchor="left"
          className="w-[520px] max-w-[calc(100vw-2rem)]"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-[2] flex-col gap-3">
              <p className="text-xs pl-2 font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Products
              </p>
              <div className="flex flex-col gap-0">
                {products.map((item) => (
                  <div key={item.href} onClick={closeMenu}>
                    <NavTile item={item} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              <p className="text-xs pl-2 font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Tools
              </p>
              <div className="flex flex-col gap-0">
                {toolItems.map((item) => (
                  <div key={item.href} onClick={closeMenu}>
                    <NavTile item={item} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DropdownPanel>
      </div>

      <div
        className="relative"
        onMouseEnter={() => handleHoverMenu("resources")}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onClick={() => toggleMenu("resources")}
          className={cn("group", navTriggerClass(activeMenu === "resources"))}
          aria-expanded={activeMenu === "resources"}
        >
          <span>Resources</span>
          <IconChevron
            className={cn(
              "size-3 transition-transform group-hover:rotate-180",
              activeMenu === "resources" ? "rotate-180" : "",
            )}
          />
        </button>
        <DropdownPanel
          isOpen={activeMenu === "resources"}
          onClose={closeMenu}
          anchor="left"
          className="w-[520px] max-w-[calc(100vw-2rem)]"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="text-xs pl-2 font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Information
              </p>
              <div className="flex flex-col gap-0">
                {infoItems.map((item) => (
                  <div key={item.href} onClick={closeMenu}>
                    <NavTile item={item} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs pl-2 font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Community
              </p>
              <div className="flex flex-col gap-1">
                {communityItems.map((item) => (
                  <div key={item.href} onClick={closeMenu}>
                    <NavTile item={item} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DropdownPanel>
      </div>
    </div>
  );
}
