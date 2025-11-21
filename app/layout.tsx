// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/web3/rainbowkit";
import { ProtocolProvider } from "@/state/protocol";
import { Toaster } from "@/components/ui/Toast";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Yearn Governance Apps",
  description: "stYFI & veYFI frontend",
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
          <Web3Providers>
            <div className="flex min-h-screen flex-col bg-background text-neutral-900 font-sans">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </Web3Providers>
        </ProtocolProvider>
      </body>
    </html>
  );
}
