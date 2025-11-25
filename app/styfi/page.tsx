// app/styfi/page.tsx
import { StyfiPageClient } from "./StyfiPageClient";

type Mode = "styfi" | "plus";

function normalizeMode(raw?: string): Mode | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === "styfi") return "styfi";
  if (lower === "plus") return "plus";
  return undefined;
}

export default function StyfiPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const initialMode = normalizeMode(searchParams.mode);
  return <StyfiPageClient initialMode={initialMode} />;
}
