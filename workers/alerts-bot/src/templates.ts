// Telegram HTML templates (parse_mode="HTML")
// Newlines are literal newlines in the message.

export const TELEGRAM_TEMPLATES = {
  // stYFI
  STYFI_STAKED: `<b>🟢 stYFI Staked</b>
Staked: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{RECEIVED_LINE}Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  STYFI_COOLDOWN_STARTED: `<b>🧊 stYFI Cooldown Started</b>
Cooldown: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
User: {USER_LINK}
Tx: {TX_LINK}`,

  STYFI_COOLDOWN_WITHDRAWN: `<b>🏁 stYFI Cooldown Withdrawn</b>
Withdrawn: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{BURNED_LINE}Owner: {OWNER_LINK}
Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  // stYFIx
  STYFIX_STAKED: `<b>🟢 stYFIx Staked</b>
Staked: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{RECEIVED_LINE}Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  STYFIX_COOLDOWN_STARTED: `<b>🧊 stYFIx Cooldown Started</b>
Cooldown: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
User: {USER_LINK}
Tx: {TX_LINK}`,

  STYFIX_COOLDOWN_WITHDRAWN: `<b>🏁 stYFIx Cooldown Withdrawn</b>
Withdrawn: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{BURNED_LINE}Owner: {OWNER_LINK}
Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  // LLYFI staking (sdYFI)
  SDYFI_STAKED: `<b>🟢 sdYFI Staked</b>
Staked: <b>{TOKEN_AMOUNT}</b> sdYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
Owner: {OWNER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  SDYFI_COOLDOWN_STARTED: `<b>🧊 sdYFI Cooldown Started</b>
Cooldown: <b>{TOKEN_AMOUNT}</b> sdYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
User: {USER_LINK}
Tx: {TX_LINK}`,

  SDYFI_COOLDOWN_WITHDRAWN: `<b>🏁 sdYFI Cooldown Withdrawn</b>
Withdrawn: <b>{TOKEN_AMOUNT}</b> sdYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
Owner: {OWNER_LINK}
Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  // LLYFI staking (supYFI)
  SUPYFI_STAKED: `<b>🟢 supYFI Staked</b>
Staked: <b>{TOKEN_AMOUNT}</b> supYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
Owner: {OWNER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  SUPYFI_COOLDOWN_STARTED: `<b>🧊 supYFI Cooldown Started</b>
Cooldown: <b>{TOKEN_AMOUNT}</b> supYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
User: {USER_LINK}
Tx: {TX_LINK}`,

  SUPYFI_COOLDOWN_WITHDRAWN: `<b>🏁 supYFI Cooldown Withdrawn</b>
Withdrawn: <b>{TOKEN_AMOUNT}</b> supYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
Owner: {OWNER_LINK}
Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  // LLYFI staking (coveYFI)
  COVEYFI_STAKED: `<b>🟢 coveYFI Staked</b>
Staked: <b>{TOKEN_AMOUNT}</b> coveYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
Owner: {OWNER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  COVEYFI_COOLDOWN_STARTED: `<b>🧊 coveYFI Cooldown Started</b>
Cooldown: <b>{TOKEN_AMOUNT}</b> coveYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
User: {USER_LINK}
Tx: {TX_LINK}`,

  COVEYFI_COOLDOWN_WITHDRAWN: `<b>🏁 coveYFI Cooldown Withdrawn</b>
Withdrawn: <b>{TOKEN_AMOUNT}</b> coveYFI
≈ <b>{YFI_EQ_AMOUNT}</b> YFI{YFI_EQ_USD}
Owner: {OWNER_LINK}
Receiver: {RECEIVER_LINK}
{CALLER_LINE}Tx: {TX_LINK}`,

  // Redemption (sdYFI)
  SDYFI_REDEEMED_FOR_YFI: `<b>💸 Redeemed sdYFI for YFI</b>
Sold: <b>{TOKEN_AMOUNT}</b> sdYFI
Received: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{FEE_LINE}User: {USER_LINK}
Tx: {TX_LINK}`,

  SDYFI_BOUGHT_WITH_YFI: `<b>🛒 Bought sdYFI with YFI</b>
Spent: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Received: <b>{TOKEN_AMOUNT}</b> sdYFI
User: {USER_LINK}
Tx: {TX_LINK}`,

  // Redemption (supYFI)
  SUPYFI_REDEEMED_FOR_YFI: `<b>💸 Redeemed supYFI for YFI</b>
Sold: <b>{TOKEN_AMOUNT}</b> supYFI
Received: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{FEE_LINE}User: {USER_LINK}
Tx: {TX_LINK}`,

  SUPYFI_BOUGHT_WITH_YFI: `<b>🛒 Bought supYFI with YFI</b>
Spent: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Received: <b>{TOKEN_AMOUNT}</b> supYFI
User: {USER_LINK}
Tx: {TX_LINK}`,

  // Redemption (coveYFI)
  COVEYFI_REDEEMED_FOR_YFI: `<b>💸 Redeemed coveYFI for YFI</b>
Sold: <b>{TOKEN_AMOUNT}</b> coveYFI
Received: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
{FEE_LINE}User: {USER_LINK}
Tx: {TX_LINK}`,

  COVEYFI_BOUGHT_WITH_YFI: `<b>🛒 Bought coveYFI with YFI</b>
Spent: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Received: <b>{TOKEN_AMOUNT}</b> coveYFI
User: {USER_LINK}
Tx: {TX_LINK}`,

  // veYFI (new)
  VEYFI_MIGRATED: `<b>🚚 veYFI Migrated</b>
Amount: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Unlock: <b>{UNLOCK_DATE}</b> (epoch <b>{UNLOCK_EPOCH}</b>)
User: {USER_LINK}
Tx: {TX_LINK}`,

  // Legacy veYFI
  LEGACY_VEYFI_EARLY_EXIT: `<b>🏃 Legacy veYFI Early Exit</b>
Withdrawn: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Penalty: <b>{PENALTY_AMOUNT}</b> YFI ({PENALTY_PCT}%)
User: {USER_LINK}
Tx: {TX_LINK}`,

  LEGACY_VEYFI_WITHDRAWN: `<b>🏦 Legacy veYFI Withdrawn</b>
Withdrawn: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
User: {USER_LINK}
Tx: {TX_LINK}`,

  LEGACY_VEYFI_LOCKED: `<b>🔐 Legacy veYFI Lock Created</b>
Locked: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Unlock: <b>{UNLOCK_DATE}</b>
User: {USER_LINK}
Tx: {TX_LINK}`,

  LEGACY_VEYFI_LOCK_UPDATED: `<b>🗓️ Legacy veYFI Lock Extended / Updated</b>
Locked: <b>{YFI_AMOUNT}</b> YFI{YFI_USD}
Unlock: <b>{UNLOCK_DATE}</b>
{PREV_LINE}User: {USER_LINK}
Tx: {TX_LINK}`,
} as const;

export const RECEIVED_LINE = `Received: <b>{TOKEN_AMOUNT}</b> {TOKEN}\n`;
export const BURNED_LINE = `Burned: <b>{TOKEN_AMOUNT}</b> {TOKEN}\n`;
export const CALLER_LINE = `Caller: {CALLER_LINK}\n`;
export const FEE_LINE = `Fee: <b>{FEE_AMOUNT}</b> YFI ({FEE_PCT}%)\n`;
export const PREV_LINE =
  `Previous: <b>{PREV_YFI_AMOUNT}</b> YFI, unlock <b>{PREV_UNLOCK_DATE}</b>\n`;
