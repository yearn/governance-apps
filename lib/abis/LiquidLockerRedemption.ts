export const LiquidLockerRedemptionAbi = [
  {
    inputs: [
      { name: "_idx", type: "uint256" },
      { name: "_ll_amount", type: "uint256" },
    ],
    name: "redeem",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_idx", type: "uint256" },
      { name: "_yfi_amount", type: "uint256" },
    ],
    name: "exchange",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "fee",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "arg0", type: "uint256" }],
    name: "capacities",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "arg0", type: "uint256" }],
    name: "used",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "arg0", type: "uint256" }],
    name: "tokens",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
