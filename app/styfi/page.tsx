// app/styfi/page.tsx
import { StyfiPageClient } from "./StyfiPageClient";

type Mode = "styfi" | "x";

function normalizeMode(raw?: string): Mode | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === "styfi") return "styfi";
  if (lower === "x") return "x";
  return undefined;
}

export default async function StyfiPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const resolvedParams = await searchParams;
  const initialMode = normalizeMode(resolvedParams.mode);
  return <StyfiPageClient initialMode={initialMode} />;
}
