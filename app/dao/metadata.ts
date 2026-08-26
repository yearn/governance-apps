import type { Metadata, Viewport } from "next";

export const daoViewport: Viewport = {
  themeColor: "#000000",
};

export function createDaoRouteMetadata(title: string): Metadata {
  return {
    title,
    description:
      "Review proposals and take part in Yearn DAO decisions.",
    applicationName: "DAO Governance",
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: "/favicons/favicon.svg", type: "image/svg+xml", sizes: "any" },
        {
          url: "/favicons/favicon-32x32.png",
          type: "image/png",
          sizes: "32x32",
        },
        {
          url: "/favicons/favicon-16x16.png",
          type: "image/png",
          sizes: "16x16",
        },
      ],
      apple: [
        {
          url: "/favicons/apple-icon-180x180.png",
          type: "image/png",
          sizes: "180x180",
        },
      ],
    },
  };
}

export const daoNotFoundMetadata: Metadata = {
  title: "Not Found",
  robots: { index: false, follow: false },
};
