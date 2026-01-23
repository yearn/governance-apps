import type { ReactElement } from "react";
import { IconDiscord } from "@/components/icons/IconDiscord";
import { LogoGithub } from "@/components/icons/LogoGithub";
import { LogoYearnGlyph } from "@/components/icons/LogoYearnGlyph";
import { IconTwitter } from "@/components/icons/IconTwitter";

type GlyphColors = { frontClassName?: string; backClassName?: string };

function yearnGlyph(colorProps: GlyphColors = {}): ReactElement {
  return (
    <LogoYearnGlyph
      className="h-10 w-10"
      frontClassName={colorProps.frontClassName}
      backClassName={colorProps.backClassName}
    />
  );
}

function AssetIcon({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-8 w-8"
      width={64}
      height={64}
      loading="eager"
    />
  );
}

const BASE_ASSET_URI = "https://assets.yearn.fi";

export type AppTile = {
  name: string;
  href: string;
  description?: string;
  icon?: ReactElement;
};

export type AppGroup = {
  title: string;
  items: AppTile[];
};

const CORE_APPS: AppTile[] = [
  {
    name: "yCRV",
    href: "https://ycrv.yearn.fi",
    description: "CRV Liquid Locker",
    icon: (
      <AssetIcon
        alt="yCRV"
        src={`${BASE_ASSET_URI}/tokens/1/0xfcc5c47be19d06bf83eb04298b026f81069ff65b/logo-128.png`}
      />
    ),
  },
  {
    name: "veYFI",
    href: "https://veyfi.yearn.fi",
    description: "Lock YFI & vote",
    icon: (
      <AssetIcon
        alt="veYFI"
        src={`${BASE_ASSET_URI}/tokens/1/0x41252e8691e964f7de35156b68493bab6797a275/logo-128.png`}
      />
    ),
  },
  {
    name: "YearnX",
    href: "https://yearn.space",
    description: "Yearn Partner Pages",
    icon: yearnGlyph({ backClassName: "text-[#0c0c0c]", frontClassName: "text-white" }),
  },
];

const TOOLS: AppTile[] = [
  {
    name: "yFactory",
    href: "https://factory.yearn.fi",
    description: "Deploy vaults",
    icon: yearnGlyph({ backClassName: "text-white", frontClassName: "text-[#0c0c0c]" }),
  },
  {
    name: "PowerGlove",
    href: "https://powerglove.yearn.fi",
    description: "Analytics",
    icon: yearnGlyph({ backClassName: "text-[#f5f5f5]", frontClassName: "text-yearn-blue" }),
  },
  {
    name: "APR Oracle",
    href: "https://oracle.yearn.fi",
    description: "Query APY oracles",
    icon: yearnGlyph({ backClassName: "text-[#6366F1]", frontClassName: "text-white" }),
  },
  {
    name: "Kong",
    href: "https://kong.yearn.fi",
    description: "Yearn Indexer",
    icon: yearnGlyph({ backClassName: "text-[#312e81]", frontClassName: "text-[#fbbf24]" }),
  },
  {
    name: "Kalani",
    href: "https://kalani.yearn.fi",
    description: "Vault Manager",
    icon: yearnGlyph({ backClassName: "text-[#0c0c0c]", frontClassName: "text-white" }),
  },
  {
    name: "yCMS",
    href: "https://cms.yearn.fi",
    description: "Vault metadata",
    icon: yearnGlyph({ backClassName: "text-[#0c0c0c]", frontClassName: "text-white" }),
  },
  {
    name: "Token Assets",
    href: "https://token-assets.yearn.fi",
    description: "Token asset tools",
    icon: yearnGlyph({ backClassName: "text-[#0F172A]", frontClassName: "text-[#38BDF8]" }),
  },
];

const RESOURCES: AppTile[] = [
  {
    name: "Docs",
    href: "https://docs.yearn.fi/",
    description: "Guides & references",
    icon: yearnGlyph({ backClassName: "text-[#0ea5e9]", frontClassName: "text-white" }),
  },
  {
    name: "Support",
    href: "https://discord.gg/yearn",
    description: "Yearn Discord",
    icon: <IconDiscord />,
  },
  {
    name: "Blog",
    href: "https://blog.yearn.fi/",
    description: "Product updates",
    icon: yearnGlyph({ backClassName: "text-[#1f2937]", frontClassName: "text-[#fde68a]" }),
  },
  {
    name: "Discourse",
    href: "https://gov.yearn.fi/",
    description: "Governance forum",
    icon: yearnGlyph({ backClassName: "text-[#1e3a8a]", frontClassName: "text-[#facc15]" }),
  },
  {
    name: "Brand Assets",
    href: "https://brand.yearn.fi",
    description: "Yearn Brand Resources",
    icon: yearnGlyph({ backClassName: "text-[#0F172A]", frontClassName: "text-[#38BDF8]" }),
  },
];

const DEPRECATED: AppTile[] = [
  {
    name: "yETH",
    href: "https://yeth.yearn.fi",
    description: "ETH LST Aggregator",
    icon: (
      <AssetIcon
        alt="yETH"
        src={`${BASE_ASSET_URI}/tokens/1/0x1bed97cbc3c24a4fb5c069c6e311a967386131f7/logo-128.png`}
      />
    ),
  },
  {
    name: "Bearn",
    href: "https://bearn.sucks/",
    description: "BGT Liquid Locker",
    icon: <AssetIcon alt="Bearn" src="/bearn-logo.png" />,
  },
  {
    name: "GIMME",
    href: "https://gimme.mom",
    description: "Easy Mode",
    icon: <div className="text-xl font-bold">G</div>,
  },
  {
    name: "yPrisma",
    href: "https://yprisma.yearn.fi",
    description: "Prisma Liquid Locker",
    icon: (
      <AssetIcon
        alt="yPrisma"
        src={`${BASE_ASSET_URI}/tokens/1/0xe3668873d944e4a949da05fc8bde419eff543882/logo-128.png`}
      />
    ),
  },
  {
    name: "Seafood",
    href: "https://seafood.yearn.watch",
    description: "Legacy dashboards",
    icon: yearnGlyph({ backClassName: "text-[#14b8a6]", frontClassName: "text-[#0f172a]" }),
  },
];

export const APP_GROUPS: AppGroup[] = [
  { title: "Apps", items: CORE_APPS },
  { title: "Analytics and Tools", items: TOOLS },
  { title: "Resources", items: RESOURCES },
  { title: "Deprecated Projects", items: DEPRECATED },
];

export const SOCIAL_LINKS = [
  { href: "https://github.com/yearn", icon: <LogoGithub className="h-5 w-5" /> },
  { href: "https://x.com/yearnfi", icon: <IconTwitter className="h-5 w-5" /> },
  { href: "https://discord.gg/yearn", icon: <IconDiscord className="h-5 w-5" /> },
];
