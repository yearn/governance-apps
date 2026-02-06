# yETH Recovery Mechanism Spec

Version: 0.1  
Status: Draft, aligned to current frontend mock implementation

This document captures the intended yETH recovery mechanism and the frontend-visible invariants.

## 1. Purpose

yETH recovery enables eligible users to recover ETH over time via Treasury-backed yield, with:

- an immediate exit option, and
- an opt-in continued participation option.

The design is voluntary, uses no bespoke per-user accounting in vault contracts, and is intended to preserve Treasury principal while routing recovery yield to participants.

## 2. Non-Negotiable Design Goals

- No Treasury principal spend.
- No Treasury ETH exposed to unvetted contracts.
- Immediate yield generation.
- Voluntary participation.
- Atomic exit path.
- No bespoke per-user accounting.
- All yield benefits opt-in participants only.
- Treasury never benefits from yield.

## 3. Architecture

### 3.1 Yield Vault (Vault B)

- Holds ETH capital (Treasury plus recovered ETH pool).
- Runs curated yield strategies.
- Uses 100% performance fee.
- Fee recipient is Recovery Vault (Vault A).

### 3.2 Recovery Vault (Vault A)

- Holds no principal strategies.
- Receives:
  - performance fees from Vault B,
  - external donations (for example stYFI revenue share).
- Issues Recovery Vault shares to users that choose the "stay" path.
- Share value increases only through donations and fee inflows.

### 3.3 Claim Contract

- Holds maximum claimable exposure to Vault B.
- Enforces eligibility and claim window.
- Executes user claim actions atomically.

## 4. Claim Paths

### 4.1 Claim and Exit (Atomic)

- Withdraw ETH from Vault B.
- Transfer ETH/WETH directly to user.
- User exits recovery permanently.

### 4.2 Claim and Stay (Atomic)

- Withdraw ETH from Vault B.
- Deposit ETH to Vault A.
- Mint Vault A shares to user.
- User remains exposed to ongoing recovery mechanics and risk.

## 5. Claim Timing and Fairness

- Vault B uses an initial report delay.
- During delay, early "stay" users are not advantaged relative to each other.
- Users claiming after yield realization into Vault A may not receive previously realized upside.
- This behavior is accepted by design.

## 6. Claim Window

- Fixed duration (illustrative: 90 days).
- During window:
  - eligible users can claim at any time.
- After window:
  - governance-defined handling for unclaimed amounts,
  - manual settlement path from Vault B,
  - no dilution of Vault A share holders from late claims.

## 7. Required Invariants

- Treasury holds zero Vault A shares.
- Treasury receives zero yield.
- Yield accrues only to opt-in participants.
- Exit remains possible through Vault B and Vault A mechanics.

## 8. Frontend-Enforced User Communication Requirements

- Present tense copy only.
- No yield optimization promises.
- No "claim early" comparative pressure language.
- Display only current-state metrics.
- Require explicit risk acknowledgement before "stay" transaction submission.

## 9. Current Mock-Mode Representation

Current frontend mock (`lib/clients/yeth/mock.ts`) models:

- claim window open/close timestamps,
- account eligibility and claim status,
- claim-and-exit and claim-and-stay transitions,
- Recovery Vault PPS and share-based redemption math,
- explicit invariant signals in the Trust and verify section:
  - Treasury Recovery Vault shares = 0,
  - Treasury yield share = 0%.

The mock is for UI and flow validation only and is not a protocol guarantee.
