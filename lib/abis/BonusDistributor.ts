export const BonusDistributorAbi = [
  {
    inputs: [
      { name: "_team", type: "address" },
      { name: "_recipient", type: "address" },
    ],
    name: "claim",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
