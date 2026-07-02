export const TeamAbi = [
  {
    inputs: [
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    name: "deposit_revenue",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_idx", type: "uint256" },
      { name: "_amount", type: "uint256" },
      { name: "_recipient", type: "address" },
    ],
    name: "claim_funding",
    outputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_idx", type: "uint256" },
      { name: "_amount", type: "uint256" },
    ],
    name: "return_funding",
    outputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
