import { describe, expect, it } from "vitest";
import { projectYbcWeight, quantizeYbcWeight } from "@/lib/clients/ybc/weight-schedule";
const DAY = 86400, GENESIS = 1_700_000_000, SCALE = 1_000_000n;
const packed = (epoch: bigint, slots: bigint[]) => (epoch << 240n) | slots.reduce((sum, weight, index) => sum | (weight << BigInt(180 - index * 60)), 0n);
describe("YBC packed weight schedule", () => {
  it("uses epoch slots instead of a linear percentage to project full activation", () => {
    const initial = packed(10n, [0n,25n,50n,75n]);
    expect(projectYbcWeight(initial,100n*SCALE,GENESIS+10*14*DAY+DAY,GENESIS)).toEqual({effective:0n,target:100n*SCALE,maturesAt:GENESIS+14*14*DAY});
    expect(projectYbcWeight(initial,100n*SCALE,GENESIS+12*14*DAY,GENESIS)).toEqual({effective:50n*SCALE,target:100n*SCALE,maturesAt:GENESIS+14*14*DAY});
    expect(projectYbcWeight(initial,100n*SCALE,GENESIS+20*14*DAY,GENESIS)).toEqual({effective:100n*SCALE,target:100n*SCALE,maturesAt:null});
  });
  it("reaches the quantized target without leaving dust perpetually activating", () => {
    expect(quantizeYbcWeight(100n*SCALE+999n)).toBe(100n*SCALE);
    expect(projectYbcWeight(packed(10n,[100n,100n,100n,100n]),100n*SCALE+999n,GENESIS+10*14*DAY,GENESIS).maturesAt).toBeNull();
    expect(projectYbcWeight(packed(10n,[0n,0n,0n,0n]),1n,GENESIS+10*14*DAY,GENESIS)).toEqual({effective:0n,target:0n,maturesAt:null});
  });
  it("preserves a mixed deposit schedule rather than resetting all stake to four epochs", () => {
    expect(projectYbcWeight(packed(10n,[75n,100n,100n,100n]),100n*SCALE,GENESIS+10*14*DAY,GENESIS).maturesAt).toBe(GENESIS+11*14*DAY);
  });
  it("handles removal and rejects future or unrepresentable schedules", () => {
    expect(projectYbcWeight(0n,100n*SCALE,GENESIS+10*14*DAY,GENESIS)).toEqual({effective:0n,target:0n,maturesAt:null});
    expect(() => projectYbcWeight(packed(11n,[0n,0n,0n,0n]),100n,GENESIS+10*14*DAY,GENESIS)).toThrow();
    expect(() => projectYbcWeight(1n,1n << 100n,GENESIS+10*14*DAY,GENESIS)).toThrow();
  });
});
