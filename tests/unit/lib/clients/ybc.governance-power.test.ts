import { describe, expect, it, vi } from "vitest";
import { parseUnits, type PublicClient } from "viem";
import example from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";
import { STYFI_GOVERNANCE } from "@/lib/clients/styfi/deployment";
import { STYFIX_ADDRESS } from "@/lib/constants";
import { readYbcGovernancePower } from "@/lib/clients/ybc/governance-power";

function setup(options: { missing?: boolean; failedStream?: boolean; poolMember?: boolean; reorg?: boolean } = {}) {
  const feed = YbcFeedSchema.parse(example);
  const account = options.poolMember ? feed.deployment.ybc : feed.members[0]!.address;
  feed.members = [{...feed.members[0]!, address:account,status:"active",upstreamStaked:parseUnits("100",18).toString(),effectiveWeight:parseUnits("25",18).toString()}];
  feed.events.activeMemberCount=1; feed.events.removedMemberCount=0;
  const epoch = Math.floor((feed.generatedAt-feed.deployment.genesis)/(14*86400));
  const slots = [25n,50n,75n,100n].reduce((sum,n,i)=>sum|((n*10n**12n)<<BigInt(180-i*60)),0n);
  let blocks=0;
  const client = {
    chain:{id:1}, getChainId:vi.fn(async()=>1),getBlockNumber:vi.fn(async()=>BigInt(feed.blockNumber+10)),
    getBlock:vi.fn(async()=>({hash:options.reorg && blocks++>0 ? "0x"+"ff".repeat(32):feed.blockHash,timestamp:BigInt(feed.generatedAt),number:BigInt(feed.blockNumber)})),
    multicall:vi.fn(async({contracts,allowFailure}: {contracts:{address:string;functionName:string;args?:string[]}[];allowFailure:boolean})=>contracts.map((contract,index)=>{
      const {functionName:fn,args}=contract;let value: unknown;
      if(fn==="weight_measure")value=STYFI_GOVERNANCE.weightMeasure;
      else if(fn==="voter")value=STYFI_GOVERNANCE.voter;
      else if(fn==="weight_aggregator")value=feed.deployment.upstreamWeightAggregator;
      else if(fn==="delegated_staking")value=STYFIX_ADDRESS;
      else if(fn==="ybc")value=feed.deployment.ybc;
      else if(fn==="ybc_weight_aggregator")value=feed.deployment.ybcWeightAggregator;
      else if(fn==="members")value=true;
      else if(fn==="num_members")value=options.missing?2n:1n;
      else if(fn==="staked")value=parseUnits("100",18);
      else if(fn==="packed_weights")value=(BigInt(epoch)<<240n)|slots;
      else if(fn==="streams")value=[0n,parseUnits("3",18),parseUnits("1",18)];
      else if(fn==="weight")value=contract.address===feed.deployment.ybcWeightAggregator?parseUnits("25",18):args?.[0]===STYFIX_ADDRESS?parseUnits("1000",18):args?.[0]===feed.deployment.ybc?parseUnits("500",18):parseUnits("100",18);
      else throw Error(fn);
      return allowFailure ? options.failedStream && index===0 ? {status:"failure",error:Error("unavailable")} : {status:"success",result:value} : value;
    })),
  } as unknown as PublicClient;
  return {feed,client,account};
}
describe("YBC DAO power overview",()=>{
  it("separates direct power and both pools at one verified block and normalizes withdrawal shares",async()=>{
    const {feed,client,account}=setup();const result=await readYbcGovernancePower(client,feed);
    expect(result).toMatchObject({ownPower:"100",delegatedPower:"1000",collectivePower:"500",totalPower:"1600"});
    expect(result.members[account.toLowerCase()]).toMatchObject({directPower:"100",exiting:"8"});
    expect(result.members[account.toLowerCase()]!.maturesAt).toBeGreaterThan(feed.generatedAt);
    for(const [call] of vi.mocked(client.multicall).mock.calls) expect(call).toHaveProperty("blockNumber",BigInt(feed.blockNumber));
  });
  it("does not double-count collective pool addresses as personal member power",async()=>{
    const {feed,client}=setup({poolMember:true});expect((await readYbcGovernancePower(client,feed)).totalPower).toBe("1500");
  });
  it("rejects incomplete rosters, inconsistent member weights and reorganized blocks",async()=>{
    const missing=setup({missing:true});await expect(readYbcGovernancePower(missing.client,missing.feed)).rejects.toThrow("incomplete");
    const mismatch=setup();mismatch.feed.members[0]!.effectiveWeight="0";await expect(readYbcGovernancePower(mismatch.client,mismatch.feed)).rejects.toThrow("differ");
    const reorg=setup({reorg:true});await expect(readYbcGovernancePower(reorg.client,reorg.feed)).rejects.toThrow("changed");
  });
  it("keeps unknown withdrawal state distinct from an empty stream",async()=>{
    const {feed,client,account}=setup({failedStream:true});const result=await readYbcGovernancePower(client,feed);
    expect(result.members[account.toLowerCase()]!.exiting).toBeNull();
    expect(result.totalPower).toBe("1600");
  });
});
