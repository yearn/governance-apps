"use client";

import { useMemo } from "react";
import encodeQR from "qr";

/** Preserve the existing encoder settings and an unobstructed quiet zone. */
export function WalletPairingQr({ uri }: { uri: string }) {
  const source = useMemo(() => {
    try {
      return encodeQR(uri, "data-url", { scale: 5, border: 4, ecc: "medium" });
    } catch {
      return null;
    }
  }, [uri]);

  if (!source)
    return <p role="alert">Could not draw the QR code. Copy the connection link instead.</p>;

  return (
    <div
      className="mx-auto max-w-full"
      data-testid="wallet-pairing-qr"
      style={{ width: 256, background: "#fff" }}
    >
      {/* Encoded locally. No pairing URI or image is sent to an image service. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        width={256}
        height={256}
        alt="WalletConnect pairing QR code"
        className="block h-auto w-full"
      />
    </div>
  );
}
