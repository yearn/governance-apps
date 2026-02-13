import { createElement, type ReactElement } from "react";
import { IconDiscord } from "@/components/icons/IconDiscord";
import { IconTelegram } from "@/components/icons/IconTelegram";
import { IconTwitter } from "@/components/icons/IconTwitter";
import { LogoCuration } from "@/components/icons/LogoCuration";
import { LogoGithub } from "@/components/icons/LogoGithub";
import { LogoYearn } from "@/components/icons/LogoYearn";
import { LogoYearnGlyph } from "@/components/icons/LogoYearnGlyph";
import { LogoYearnMark } from "@/components/icons/LogoYearnMark";
import { isYethEnabled } from "@/lib/runtime/features";

const BASE_YEARN_ASSET_URI = "https://assets.yearn.fi";
const NEUTRAL_IMAGE_CLASS =
  "size-5 grayscale opacity-90 dark:invert dark:brightness-125";
const NEUTRAL_ICON_CLASS = "size-5 text-neutral-700 dark:text-white";

export type NavItem = {
  name: string;
  href: string;
  description: string;
  icon?: ReactElement;
  iconWrapperClass?: string;
};

export type AppLink = {
  name: string;
  href: string;
  icon?: ReactElement;
  iconWrapperClass?: string;
};

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export const PRODUCTS: NavItem[] = [
  {
    name: "yVaults",
    href: "https://yearn.fi/vaults",
    description: "Yield-Generating Vaults",
    icon: createElement(LogoYearnMark, {
      className: "size-6 text-yearn-blue",
    }),
  },
  {
    name: "Curation",
    href: "https://app.morpho.org/ethereum/earn?v2=false&curators=yearn",
    description: "Lending Market Curation",
    icon: createElement(LogoCuration, {
      className: "size-11",
      back: "text-transparent",
      front: "text-yearn-blue",
    }),
  },
  {
    name: "yCRV",
    href: "https://ycrv.yearn.fi",
    description: "veCRV Liquid Locker",
    icon: createElement("img", {
      alt: "yCRV",
      className: "size-6",
      src: `${BASE_YEARN_ASSET_URI}/tokens/1/0xfcc5c47be19d06bf83eb04298b026f81069ff65b/logo-128.png`,
    }),
  },
  {
    name: "yYB",
    href: "https://yyb.yearn.fi",
    description: "veYB Liquid Locker",
    icon: createElement("img", {
      alt: "yYB",
      className: "size-6",
      src: "/yYB-logo.svg",
    }),
  },
  {
    name: "stYFI",
    href: "/styfi",
    description: "YFI Staking",
    icon: createElement("img", {
      alt: "stYFI",
      className: "size-6",
      src: "/tokens/styfi.svg",
    }),
  },
];

export const INFO_ITEMS: NavItem[] = [
  {
    name: "Docs",
    href: "https://docs.yearn.fi/",
    description: "Yearn Knowledge Base",
    icon: createElement("img", {
      alt: "GitBook",
      className: NEUTRAL_IMAGE_CLASS,
      src: "/GitBook - Icon - Dark.svg",
    }),
  },
  {
    name: "X (Twitter)",
    href: "https://x.com/yearnfi",
    description: "Official Yearn News Feed",
    icon: createElement(IconTwitter, {
      className: NEUTRAL_ICON_CLASS,
    }),
  },
  {
    name: "Github",
    href: "https://github.com/yearn",
    description: "Yearn Codebase",
    icon: createElement(LogoGithub, {
      className: NEUTRAL_ICON_CLASS,
    }),
  },
  {
    name: "Blog",
    href: "https://blog.yearn.fi/",
    description: "Articles about Yearn",
    icon: createElement("img", {
      alt: "Blog",
      className: NEUTRAL_IMAGE_CLASS,
      src: "/paragraph.svg",
    }),
  },
  {
    name: "Brand Assets",
    href: "https://brand.yearn.fi",
    description: "Yearn Brand Resources",
    icon: createElement(LogoYearn, {
      width: 20,
      height: 20,
      className: "size-5",
      back: "text-neutral-700 dark:text-neutral-200",
      front: "text-white",
    }),
  },
];

export const TOOLS: NavItem[] = [
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

export const COMMUNITY: NavItem[] = [
  {
    name: "Support",
    href: "https://discord.gg/yearn",
    description: "Yearn Discord Server",
    icon: createElement(IconDiscord, {
      className: NEUTRAL_ICON_CLASS,
    }),
  },
  {
    name: "Telegram Chat",
    href: "https://t.me/yearnfinance",
    description: "Discuss Yearn on Telegram",
    icon: createElement(IconTelegram, {
      className: NEUTRAL_ICON_CLASS,
    }),
  },
  {
    name: "Governance",
    href: "https://gov.yearn.fi/",
    description: "Yearn Discussion Forum",
    icon: createElement("img", {
      alt: "Discourse",
      className: NEUTRAL_IMAGE_CLASS,
      src: "/discourse-icon.svg",
    }),
  },
];

const coreAppLinks: AppLink[] = [
  {
    name: "stYFI",
    href: "/styfi",
    icon: createElement("img", {
      alt: "stYFI",
      className: "size-5",
      src: "/tokens/styfi.svg",
    }),
  },
  {
    name: "veYFI",
    href: "/veyfi",
    icon: createElement(LogoYearnGlyph, {
      className: "size-5",
      backClassName: "text-disco-700 dark:text-disco-600",
      frontClassName: "text-white",
    }),
  },
];

const yethLink: AppLink = {
  name: "yETH",
  href: "/yeth",
  icon: createElement(LogoYearnMark, {
    className: "size-5 text-yearn-blue",
  }),
};

export const APP_LINKS: AppLink[] = [
  ...coreAppLinks,
  ...(isYethEnabled() ? [yethLink] : []),
];
