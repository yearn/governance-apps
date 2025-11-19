// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/web3/rainbowkit";
import { QueryProviders } from "@/state/query-client";

export const metadata: Metadata = {
  title: "Yearn Governance Apps",
  description: "stYFI & veYFI frontend (WIP)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProviders>
          <Web3Providers>{children}</Web3Providers>
        </QueryProviders>
      </body>
    </html>
  );
}
