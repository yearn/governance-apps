import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_MOTD_URL;
  if (!url) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_MOTD_URL is not set" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch MOTD" },
        { status: response.status }
      );
    }

    const json = await response.json();
    const cacheControl = response.headers.get("cache-control");
    return NextResponse.json(json, {
      headers: cacheControl ? { "Cache-Control": cacheControl } : undefined,
    });
  } catch (error) {
    console.warn("MOTD proxy failed", error);
    return NextResponse.json(
      { error: "Failed to fetch MOTD" },
      { status: 500 }
    );
  }
}
