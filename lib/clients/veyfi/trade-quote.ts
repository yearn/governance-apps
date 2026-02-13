export type TradeQuoteInput = {
  amount: bigint;
  exchangeRate: bigint;
  isSell: boolean;
};

export type TradeQuote = {
  hasValidExchangeRate: boolean;
  yfiValue: bigint;
  llyfiValue: bigint;
};

export function computeTradeQuote({
  amount,
  exchangeRate,
  isSell,
}: TradeQuoteInput): TradeQuote {
  if (exchangeRate <= 0n) {
    return {
      hasValidExchangeRate: false,
      yfiValue: 0n,
      llyfiValue: 0n,
    };
  }

  return {
    hasValidExchangeRate: true,
    yfiValue: isSell ? amount / exchangeRate : amount,
    llyfiValue: isSell ? amount : amount * exchangeRate,
  };
}
