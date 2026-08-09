/** Values match the ProjectX / TopstepX API spec exactly. */
export const OrderType = {
  LIMIT: 1,
  MARKET: 2,
  STOP: 4,
  TRAILING_STOP: 5,
  JOIN_BID: 6,
  JOIN_ASK: 7,
} as const;
export type OrderTypeValue = (typeof OrderType)[keyof typeof OrderType];

export const OrderSide = {
  BUY: 0, // "Bid"
  SELL: 1, // "Ask"
} as const;
export type OrderSideValue = (typeof OrderSide)[keyof typeof OrderSide];

export const ORDER_TYPE_LABELS: { value: OrderTypeValue; label: string }[] = [
  { value: OrderType.MARKET, label: "Market" },
  { value: OrderType.LIMIT, label: "Limit" },
  { value: OrderType.STOP, label: "Stop" },
  { value: OrderType.TRAILING_STOP, label: "Trailing stop" },
];