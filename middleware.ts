import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Configuration: Map incoming hostnames to internal Next.js application routes
const HOST_TO_PREFIX: Record<string, string> = {
  "styfi.yearn.fi": "/styfi",
  "veyfi.yearn.fi": "/veyfi",
  "yeth.yearn.fi": "/yeth",
};

// Regex to detect public files that should skip rewriting.
// This is safer than checking for dots, which might exist in valid URL slugs.
const PUBLIC_FILE =
  /\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt|xml|webmanifest|woff|woff2|ttf|eot)$/i;

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = url.hostname.toLowerCase();

  // 1. Determine the intended application based on the Host header
  const prefix = HOST_TO_PREFIX[hostname];

  const isHeadRequest = request.method === "HEAD";

  // If the hostname isn't in our map (e.g. app.dao-ops.com or localhost),
  // pass through to the default root page (the Launcher).
  // 2. Safety Checks: Skip rewriting for internals and static assets
  const isSkippablePath =
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/fonts") ||
    url.pathname.startsWith("/.well-known") ||
    PUBLIC_FILE.test(url.pathname);

  if (isHeadRequest && !isSkippablePath) {
    const headUrl = url.clone();
    headUrl.pathname = prefix ?? "/";
    return NextResponse.rewrite(headUrl);
  }

  if (!prefix) {
    return NextResponse.next();
  }

  if (isSkippablePath) {
    return NextResponse.next();
  }

  // 3. Double-Prefix Guard
  // If the user visits styfi.yearn.fi/styfi/dashboard, we don't want /styfi/styfi/dashboard.
  // We only apply the prefix if it's not already there.
  if (!url.pathname.startsWith(prefix)) {
    url.pathname = `${prefix}${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  // Match all paths except explicit Next.js internals to be efficient
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
