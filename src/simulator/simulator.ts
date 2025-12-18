import { Protocol, UserDeposit, OptimizationResult } from '../defi/types';
import { Candle, TradeDecision, Account } from '../trading/types';
import { optimizeYield } from '../defi/yieldOptimizer';
import { generateTradeDecision } from '../trading/strategyEngine';
import {
  Portfolio,
  TradePosition,
  DefiDeposit,
  Operation,
  SimulationStats,
  SimulatorConfig,
  PositionStatus,
  OperationType,
} from './types';

export class TradingDefiSimulator {
  private portfolio: Portfolio;
  private operations: Operation[] = [];
  private config: SimulatorConfig;
  private peakBalance: number;
  private maxDrawdown: number = 0;
  private maxDrawdownPercent: number = 0;
  private closedTrades: TradePosition[] = [];
  private completedDefiDeposits: DefiDeposit[] = [];

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.portfolio = {
      cashBalance: config.initialBalance,
      activeTrades: [],
      activeDefiDeposits: [],
      totalInvested: 0,
      totalWithdrawn: 0,
    };
    this.peakBalance = config.initialBalance;
  }

  openTrade(decision: TradeDecision, currentPrice: number): string | null {
    if (decision.action === 'HOLD' || !decision.entry || !decision.stopLoss || !decision.takeProfit || !decision.positionSize) {
      return null;
    }

    if (this.portfolio.activeTrades.length >= this.config.maxOpenTrades) {
      return null;
    }

    const positionValue = decision.positionSize * decision.entry;
    if (positionValue > this.portfolio.cashBalance) {
      return null;
    }

    const position: TradePosition = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: decision.action,
      entryPrice: decision.entry,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
      positionSize: decision.positionSize,
      entryTime: Date.now(),
      status: 'OPEN',
    };

    this.portfolio.cashBalance -= positionValue;
    this.portfolio.activeTrades.push(position);
    this.portfolio.totalInvested += positionValue;

    this.addOperation('TRADE_OPEN', positionValue, `Opened ${decision.action} position: ${decision.positionSize.toFixed(4)} @ $${decision.entry.toFixed(2)}`);

    return position.id;
  }

  closeTrade(positionId: string, closePrice: number, reason: string = 'Manual'): boolean {
    const position = this.portfolio.activeTrades.find(t => t.id === positionId);
    if (!position || position.status !== 'OPEN') {
      return false;
    }

    let pnl: number;
    if (position.action === 'LONG') {
      pnl = (closePrice - position.entryPrice) * position.positionSize;
    } else {
      pnl = (position.entryPrice - closePrice) * position.positionSize;
    }

    const pnlPercent = (pnl / (position.entryPrice * position.positionSize)) * 100;
    const positionValue = position.positionSize * closePrice;

    position.closePrice = closePrice;
    position.closeTime = Date.now();
    position.status = 'CLOSED';
    position.pnl = pnl;
    position.pnlPercent = pnlPercent;

    this.portfolio.cashBalance += positionValue;
    this.closedTrades.push(position);
    this.portfolio.activeTrades = this.portfolio.activeTrades.filter(t => t.id !== positionId);

    this.addOperation('TRADE_CLOSE', positionValue, `Closed ${position.action} position: PnL $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) - ${reason}`);

    this.updateStats();
    return true;
  }

  updateTrades(candles: Candle[]): void {
    if (candles.length === 0) return;

    const currentPrice = candles[candles.length - 1].close;
    const currentTime = Date.now();

    for (const position of [...this.portfolio.activeTrades]) {
      let shouldClose = false;
      let closePrice = currentPrice;
      let reason = '';

      if (position.action === 'LONG') {
        if (currentPrice <= position.stopLoss) {
          shouldClose = true;
          closePrice = position.stopLoss;
          reason = 'Stop Loss';
        } else if (currentPrice >= position.takeProfit && this.config.autoCloseOnTarget) {
          shouldClose = true;
          closePrice = position.takeProfit;
          reason = 'Take Profit';
        }
      } else {
        if (currentPrice >= position.stopLoss) {
          shouldClose = true;
          closePrice = position.stopLoss;
          reason = 'Stop Loss';
        } else if (currentPrice <= position.takeProfit && this.config.autoCloseOnTarget) {
          shouldClose = true;
          closePrice = position.takeProfit;
          reason = 'Take Profit';
        }
      }

      if (shouldClose) {
        this.closeTrade(position.id, closePrice, reason);
      }
    }
  }

  createDefiDeposit(protocol: Protocol, amount: number, horizonDays: number): string | null {
    if (amount > this.portfolio.cashBalance) {
      return null;
    }

    if (!this.config.enableDefi) {
      return null;
    }

    const deposit: DefiDeposit = {
      id: `defi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      protocol,
      amount,
      startTime: Date.now(),
      endTime: Date.now() + (horizonDays * 24 * 60 * 60 * 1000),
      expectedProfit: 0,
      status: 'ACTIVE',
    };

    const userDeposit: UserDeposit = {
      amount,
      horizonDays,
      riskLevel: 'medium',
    };
    const results = optimizeYield([protocol], userDeposit);
    if (results.length > 0) {
      deposit.expectedProfit = results[0].expectedProfitAbsolute;
    }

    this.portfolio.cashBalance -= amount;
    this.portfolio.activeDefiDeposits.push(deposit);
    this.portfolio.totalInvested += amount;

    this.addOperation('DEFI_DEPOSIT', amount, `Deposited $${amount.toFixed(2)} to ${protocol.name} for ${horizonDays} days`);

    return deposit.id;
  }

  withdrawDefiDeposit(depositId: string): boolean {
    const deposit = this.portfolio.activeDefiDeposits.find(d => d.id === depositId);
    if (!deposit || deposit.status !== 'ACTIVE') {
      return false;
    }

    const now = Date.now();
    const daysElapsed = (now - deposit.startTime) / (24 * 60 * 60 * 1000);
    const daysTotal = (deposit.endTime - deposit.startTime) / (24 * 60 * 60 * 1000);

    let currentValue = deposit.amount;
    if (daysElapsed >= daysTotal) {
      currentValue = deposit.amount + deposit.expectedProfit;
      deposit.status = 'COMPLETED';
    } else {
      const profitRatio = daysElapsed / daysTotal;
      currentValue = deposit.amount + (deposit.expectedProfit * profitRatio);
      deposit.status = 'WITHDRAWN';
    }

    deposit.currentValue = currentValue;
    const profit = currentValue - deposit.amount;

    this.portfolio.cashBalance += currentValue;
    this.portfolio.totalWithdrawn += currentValue;
    this.completedDefiDeposits.push(deposit);
    this.portfolio.activeDefiDeposits = this.portfolio.activeDefiDeposits.filter(d => d.id !== depositId);

    this.addOperation('DEFI_WITHDRAW', currentValue, `Withdrew $${currentValue.toFixed(2)} from ${deposit.protocol.name} (profit: $${profit.toFixed(2)})`);

    this.updateStats();
    return true;
  }

  updateDefiDeposits(): void {
    const now = Date.now();
    for (const deposit of [...this.portfolio.activeDefiDeposits]) {
      if (now >= deposit.endTime && deposit.status === 'ACTIVE') {
        this.withdrawDefiDeposit(deposit.id);
      }
    }
  }

  generateTradeDecision(candles: Candle[]): TradeDecision {
    const account: Account = {
      balance: this.portfolio.cashBalance,
      riskPerTrade: this.config.tradingRiskPerTrade,
    };
    return generateTradeDecision(candles, account);
  }

  findBestDefiProtocol(protocols: Protocol[], horizonDays: number, riskLevel: 'low' | 'medium' | 'high' = 'medium'): OptimizationResult | null {
    const userDeposit: UserDeposit = {
      amount: this.portfolio.cashBalance,
      horizonDays,
      riskLevel,
    };
    const results = optimizeYield(protocols, userDeposit);
    return results.length > 0 ? results[0] : null;
  }

  private updateStats(): void {
    const currentBalance = this.getTotalBalance();
    if (currentBalance > this.peakBalance) {
      this.peakBalance = currentBalance;
    }

    const drawdown = this.peakBalance - currentBalance;
    const drawdownPercent = (drawdown / this.peakBalance) * 100;

    if (drawdown > this.maxDrawdown) {
      this.maxDrawdown = drawdown;
      this.maxDrawdownPercent = drawdownPercent;
    }
  }

  private addOperation(type: OperationType, amount: number, description: string): void {
    const operation: Operation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      amount,
      description,
      balanceAfter: this.portfolio.cashBalance,
    };
    this.operations.push(operation);
  }

  getTotalBalance(): number {
    let total = this.portfolio.cashBalance;

    for (const trade of this.portfolio.activeTrades) {
      if (trade.closePrice) {
        total += trade.closePrice * trade.positionSize;
      } else {
        total += trade.entryPrice * trade.positionSize;
      }
    }

    for (const deposit of this.portfolio.activeDefiDeposits) {
      if (deposit.currentValue) {
        total += deposit.currentValue;
      } else {
        const now = Date.now();
        const daysElapsed = (now - deposit.startTime) / (24 * 60 * 60 * 1000);
        const daysTotal = (deposit.endTime - deposit.startTime) / (24 * 60 * 60 * 1000);
        if (daysTotal > 0) {
          const profitRatio = Math.min(daysElapsed / daysTotal, 1);
          total += deposit.amount + (deposit.expectedProfit * profitRatio);
        } else {
          total += deposit.amount;
        }
      }
    }

    return total;
  }

  getStats(): SimulationStats {
    const winningTrades = this.closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const losingTrades = this.closedTrades.filter(t => (t.pnl || 0) <= 0).length;
    const totalTrades = this.closedTrades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalPnl = this.closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalPnlPercent = this.config.initialBalance > 0 
      ? (totalPnl / this.config.initialBalance) * 100 
      : 0;

    const totalDefiProfit = this.completedDefiDeposits.reduce((sum, d) => {
      const profit = (d.currentValue || d.amount + d.expectedProfit) - d.amount;
      return sum + profit;
    }, 0);
    const totalDefiProfitPercent = this.config.initialBalance > 0
      ? (totalDefiProfit / this.config.initialBalance) * 100
      : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnl,
      totalPnlPercent,
      totalDefiProfit,
      totalDefiProfitPercent,
      maxDrawdown: this.maxDrawdown,
      maxDrawdownPercent: this.maxDrawdownPercent,
      peakBalance: this.peakBalance,
      currentBalance: this.getTotalBalance(),
      totalOperations: this.operations.length,
    };
  }

  getPortfolio(): Portfolio {
    return { ...this.portfolio };
  }

  getOperations(limit?: number): Operation[] {
    const sorted = [...this.operations].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getClosedTrades(): TradePosition[] {
    return [...this.closedTrades];
  }

  getCompletedDefiDeposits(): DefiDeposit[] {
    return [...this.completedDefiDeposits];
  }
}
