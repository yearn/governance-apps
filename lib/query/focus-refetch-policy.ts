const FOCUS_REFETCH_POLICY = {
  "styfi.account": true,
  "veyfi.account": true,
  "yeth.account": true,
  "styfi.statsOverride": false,
  "veyfi.statsOverride": false,
  "cross-app.nudge": false,
} as const;

export type FocusRefetchPolicyKey = keyof typeof FOCUS_REFETCH_POLICY;

export function getRefetchOnWindowFocus(
  key: FocusRefetchPolicyKey | string
): boolean {
  return FOCUS_REFETCH_POLICY[key as FocusRefetchPolicyKey] ?? false;
}
