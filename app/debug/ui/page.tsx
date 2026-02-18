import { notFound } from "next/navigation";
import { DebugUiClient } from "./DebugUiClient";
import { isDebugUiEnabled } from "@/lib/runtime/features";

export default function DebugUiPage() {
  if (!isDebugUiEnabled()) {
    notFound();
  }
  return <DebugUiClient />;
}
