export const YbcAbi = [
  {
    inputs: [{ name: "_account", type: "address" }],
    name: "members",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_operator", type: "address" }],
    name: "operators",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
