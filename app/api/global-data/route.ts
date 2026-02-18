import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_GLOBAL_DATA_URL;
  if (!url) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_GLOBAL_DATA_URL is not set" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch global data" },
        { status: response.status },
      );
    }

    const json = await response.json();
    return NextResponse.json(json, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.warn("Global data proxy failed", error);
    return NextResponse.json(
      { error: "Failed to fetch global data" },
      { status: 500 },
    );
  }
}
