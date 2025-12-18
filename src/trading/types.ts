export type TradeAction = 'LONG' | 'SHORT' | 'HOLD';

export interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Account {
  balance: number;
  riskPerTrade: number; // Percentage of balance to risk per trade (e.g., 0.02 for 2%)
}

export interface TradeDecision {
  action: TradeAction;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  positionSize: number | null;
  explanation: string;
}

