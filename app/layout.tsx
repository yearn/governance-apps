// app/layout.tsx
import "./globals.css";
import { Web3Providers } from "@/web3/rainbowkit";
import { ProtocolProvider } from "@/state/protocol";
import { IdentityProvider } from "@/state/identity";
import { Toaster } from "@/components/ui/Toast";
import { Header } from "@/components/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Web3Providers>
          <ProtocolProvider>
            <IdentityProvider>
              {" "}
              {/* Added */}
              <div className="flex min-h-screen flex-col bg-app text-text-primary font-sans">
                <Header />
                <main className="flex-1">{children}</main>
              </div>
              <Toaster />
            </IdentityProvider>
          </ProtocolProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
