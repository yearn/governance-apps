type SecurityHeaderOptions = {
  nonce: string;
  isDevelopment: boolean;
  isProduction: boolean;
  allowUnsafeInlineScripts?: boolean;
};

function joinDirectives(directives: string[]) {
  return directives.join("; ");
}

export const PERMISSIONS_POLICY_HEADER = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
  "browsing-topics=()",
].join(", ");

export const CROSS_ORIGIN_OPENER_POLICY_HEADER = "same-origin-allow-popups";
export const CROSS_ORIGIN_RESOURCE_POLICY_HEADER = "same-site";
export const ORIGIN_AGENT_CLUSTER_HEADER = "?1";

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  isProduction,
  allowUnsafeInlineScripts = false,
}: SecurityHeaderOptions): string {
  const scriptSrcDirectives = [
    "'self'",
    // Next.js webpack dev runtime relies on eval for source maps/HMR.
    isDevelopment ? "'unsafe-eval'" : null,
    allowUnsafeInlineScripts ? "'unsafe-inline'" : `'nonce-${nonce}'`,
  ]
    .filter((directive): directive is string => directive !== null)
    .join(" ");
  const scriptSrc = `script-src ${scriptSrcDirectives}`;
  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https: wss:${isDevelopment ? " http://localhost:* ws://localhost:*" : ""}`,
    "frame-src 'self' https://verify.walletconnect.com https://*.walletconnect.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return joinDirectives(directives);
}

export function buildPermissionsPolicy(): string {
  return PERMISSIONS_POLICY_HEADER;
}

export function buildSecurityHeaders(options: SecurityHeaderOptions) {
  const headers: Record<string, string> = {
    "Content-Security-Policy": buildContentSecurityPolicy(options),
    "Permissions-Policy": buildPermissionsPolicy(),
    "Cross-Origin-Opener-Policy": CROSS_ORIGIN_OPENER_POLICY_HEADER,
    "Cross-Origin-Resource-Policy": CROSS_ORIGIN_RESOURCE_POLICY_HEADER,
    "Origin-Agent-Cluster": ORIGIN_AGENT_CLUSTER_HEADER,
  };

  return headers;
}
