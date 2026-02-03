# 7. Copywriting & Tone of Voice

**Version:** 1.1
**Source:** Yearn Tone of Voice Guide
**Scope:** All user-facing text, error messages, toasts, and tooltips.

---

## 1. The Core Philosophy

**"Write code, talk human."**

Yearn is high-tech, but our interface should not be. We do not speak in `contract_reverts` or `generic_success_flags`. We speak to the user as a confident, knowledgeable peer.

### The 5 Commandments

1.  **Write code, talk human:** Clarity over complexity. No corporate speak.
2.  **Embrace culture, shape culture:** We are crypto-native. It's okay to nod to the culture (wagmi, anon, etc) where appropriate, but never at the cost of clarity.
3.  **Money, the ultimate meme:** Humor is allowed. Don't be boring.
4.  **Weirdos welcome:** Non-judgmental. Open.
5.  **Truth + Transparency = Trust:** If something breaks, say it. If a fee exists, show it.

---

## 2. UI Specific Guidelines

### 2.1. Error Messages (Commandment 1 & 5)

Never show raw contract errors to the user. Translate them.

| Context       | Bad Copy (Robot)            | Good Copy (Human)                                                |
| :------------ | :-------------------------- | :--------------------------------------------------------------- |
| **Slippage**  | `Error: execution reverted` | "Slippage too high. Try increasing your tolerance."              |
| **Rejected**  | `UserRejectedRequestError`  | "Transaction cancelled."                                         |
| **Cap Hit**   | `Limit exceeded`            | "Global deposit limit reached. You cannot stake more right now." |
| **Blacklist** | `Access Denied`             | "This address is restricted from using this interface."          |

### 2.2. Success States (Commandment 3)

Celebration is encouraged.

- **Boring:** "Transaction confirmed."
- **Yearn:** "Success! Your YFI is now staking." / "Welcome to the vault."

### 2.3. Empty States (Commandment 2)

Empty states are opportunities for education or personality, not dead ends.

- **Boring:** "No data found."
- **Yearn:** "No positions found. Deposit tokens to get started."

### 2.4. Buttons & CTAs (Commandment 1)

Be direct.

- **Bad:** "Execute", "Submit", "Proceed"
- **Good:** "Stake", "Withdraw", "Claim Rewards"

---

## 3. Formatting Standards

- **Sentence Case:** Use sentence case for headings and buttons (e.g., "Connect wallet", not "CONNECT WALLET" or "Connect Wallet").
- **Numbers:** Use `Aeonik Mono` for all financial data.
- **Precision:**
  - Dollar values: 2 decimals (`$1,234.56`).
  - Token amounts: Dynamic based on value (show dust if relevant, otherwise 4 decimals).
  - Percentages: 2 decimals (`4.20%`).

---

## 4. Glossary

| Term              | Usage                                                                    |
| :---------------- | :----------------------------------------------------------------------- |
| **stYFI**         | Always lowercase 'st', uppercase 'YFI'.                                  |
| **veYFI**         | Always lowercase 've', uppercase 'YFI'.                                  |
| **LLYFI**         | Liquid Lockers (generic term).                                           |
| **Active**        | Funds currently staked and earning rewards.                              |
| **Unstaking**     | Funds currently in the linear cooldown stream (locked).                  |
| **Withdrawable**  | Funds fully unlocked (finished streaming) but not yet withdrawn.         |
| **Gauge**         | The contract where you stake BPT/LP tokens.                              |
| **Vote Weight**   | The power used in governance.                                            |
