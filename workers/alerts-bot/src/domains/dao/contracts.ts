import { parseAbi } from "viem";

// Matches docs/apps/dao/examples/mainnet-deployments.json and the app's pinned
// stYFI revision 9395d5e6fffdfe21fda32af94d32fca1a4f7840b.
export const DAO_VOTING = "0x543e8871562a8c53e8b6a26835aeecb3a5a13070";
export const DAO_VOTER = "0x5069bce8c8e371a45ab113604b128bbdf5ee5c11";
export const DAO_EXECUTOR = "0xac7d4a37ba61c2cac7f64d3e2b5773d85613fe7b";
export const DAO_DEPLOYMENT_BLOCK = 25_883_944;
export const DAO_GENESIS = 1_770_249_600;
export const DAO_EPOCH = 14 * 24 * 60 * 60;
export const DAO_REMINDERS = [86_400, 3_600] as const;

export const DAO_EVENTS = parseAbi([
  "event Propose(uint256 indexed idx,address indexed proposer,uint256 indexed epoch,bytes32 ipfs,bytes script)",
  "event Retract(uint256 indexed idx)",
  "event Vote(address indexed account,uint256 indexed idx,uint256 weight,uint256 yea)",
  "event Flag(uint256 indexed idx,string reason)",
  "event Veto(uint256 indexed idx,string reason)",
  "event Execute(address indexed executor,uint256 indexed idx)",
  "event SetProposeParameters(uint256 min_weight,uint256 cooldown,address blacklist)",
  "event SetVoteParameters(uint256 length,address voter)",
  "event SetExecuteParameters(uint256 delay,bool guard,address executor)",
  "event SetThreshold(uint256 threshold)",
  "event SetHooks(address indexed hooks)",
  "event SetWeightMeasure(address indexed measure)",
  "event SetOperator(address indexed operator)",
  "event PendingGuardian(address indexed guardian)",
  "event SetGuardian(address indexed guardian)",
  "event PendingManagement(address indexed management)",
  "event SetManagement(address indexed management)",
]);

export const DAO_VOTER_EVENTS = parseAbi([
  "event SetDecayLength(uint256 length)",
  "event SetDelegatedStaking(address indexed staking)",
  "event SetYBC(address indexed ybc)",
  "event SetYBCWeightAggregator(address indexed aggregator)",
  "event PendingManagement(address indexed management)",
  "event SetManagement(address indexed management)",
]);

export const DAO_READS = parseAbi([
  "function genesis() view returns (uint256)",
  "function proposals(uint256) view returns ((address proposer,uint256 epoch,bytes32 ipfs,bytes32 script_hash,uint256 threshold,uint256 votes,uint256 yea,bool retracted,bool executed,bool flagged,bool vetoed))",
  "function vote_start() view returns (uint256)",
  "function execute_delay() view returns (uint256)",
  "function execute_guard() view returns (bool)",
  "function voter() view returns (address)",
  "function executor() view returns (address)",
  "function operator() view returns (address)",
  "function decay_length() view returns (uint256)",
]);
