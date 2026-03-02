export const YethClaimAbi = [
  {
    inputs: [],
    name: "deadline",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "recovery_rate",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_account", type: "address" }],
    name: "claimable",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_exit", type: "bool" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
