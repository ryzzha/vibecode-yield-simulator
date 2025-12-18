import { Protocol, UserDeposit, OptimizationResult } from '../defi/types';
import { Candle, TradeDecision, Account } from '../trading/types';

export type OperationType = 'TRADE_OPEN' | 'TRADE_CLOSE' | 'DEFI_DEPOSIT' | 'DEFI_WITHDRAW';

export type PositionStatus = 'OPEN' | 'CLOSED' | 'LIQUIDATED';

export interface TradePosition {
  id: string;
  action: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  entryTime: number;
  closePrice?: number;
  closeTime?: number;
  status: PositionStatus;
  pnl?: number;
  pnlPercent?: number;
}

export interface DefiDeposit {
  id: string;
  protocol: Protocol;
  amount: number;
  startTime: number;
  endTime: number;
  expectedProfit: number;
  status: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';
  currentValue?: number;
}

export interface Operation {
  id: string;
  type: OperationType;
  timestamp: number;
  amount: number;
  description: string;
  balanceAfter: number;
}

export interface Portfolio {
  cashBalance: number;
  activeTrades: TradePosition[];
  activeDefiDeposits: DefiDeposit[];
  totalInvested: number;
  totalWithdrawn: number;
}

export interface SimulationStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalDefiProfit: number;
  totalDefiProfitPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  peakBalance: number;
  currentBalance: number;
  totalOperations: number;
}

export interface SimulatorConfig {
  initialBalance: number;
  tradingRiskPerTrade: number;
  maxOpenTrades: number;
  autoCloseOnTarget: boolean;
  enableDefi: boolean;
}
