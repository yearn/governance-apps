// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/web3/rainbowkit";
import { ProtocolProvider } from "@/state/protocol";

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
        <ProtocolProvider>
          {/* Web3Providers now manages Wagmi -> Query -> RainbowKit nesting */}
          <Web3Providers>{children}</Web3Providers>
        </ProtocolProvider>
      </body>
    </html>
  );
}
