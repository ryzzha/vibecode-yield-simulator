import { Candle, Account, TradeDecision, TradeAction } from './types';
import {
  getLatestEMA,
  isBullishStructure,
  isBearishStructure,
  findSwingHigh,
  findSwingLow,
} from './indicators';

const EMA_SHORT_PERIOD = 20;
const EMA_LONG_PERIOD = 50;
const RISK_REWARD_RATIO = 2;

function calculatePositionSize(
  account: Account,
  entry: number,
  stopLoss: number,
  action: 'LONG' | 'SHORT'
): number {
  const riskAmount = account.balance * account.riskPerTrade;
  
  let riskPerUnit: number;
  if (action === 'LONG') {
    riskPerUnit = entry - stopLoss;
  } else {
    riskPerUnit = stopLoss - entry;
  }
  
  if (riskPerUnit <= 0) {
    return 0;
  }
  
  const positionSize = riskAmount / riskPerUnit;
  return Math.max(0, positionSize);
}

function generateExplanation(
  action: TradeAction,
  ema20: number | null,
  ema50: number | null,
  entry: number | null,
  stopLoss: number | null,
  takeProfit: number | null,
  positionSize: number | null
): string {
  if (action === 'HOLD') {
    return 'No clear trend detected. EMA20 and EMA50 are not aligned, or market structure is unclear. Waiting for better setup.';
  }
  
  const parts: string[] = [];
  
  if (action === 'LONG') {
    parts.push(`LONG signal: EMA20 (${ema20?.toFixed(2)}) > EMA50 (${ema50?.toFixed(2)})`);
    parts.push('Bullish structure detected');
  } else {
    parts.push(`SHORT signal: EMA20 (${ema20?.toFixed(2)}) < EMA50 (${ema50?.toFixed(2)})`);
    parts.push('Bearish structure detected');
  }
  
  if (entry !== null && stopLoss !== null && takeProfit !== null) {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    const rrRatio = reward / risk;
    
    parts.push(`Entry: ${entry.toFixed(2)}, Stop Loss: ${stopLoss.toFixed(2)}, Take Profit: ${takeProfit.toFixed(2)}`);
    parts.push(`Risk/Reward: 1:${rrRatio.toFixed(2)}`);
  }
  
  if (positionSize !== null) {
    parts.push(`Position size: ${positionSize.toFixed(4)} units`);
  }
  
  return parts.join('. ') + '.';
}

export function generateTradeDecision(
  candles: Candle[],
  account: Account
): TradeDecision {
  if (candles.length < EMA_LONG_PERIOD) {
    return {
      action: 'HOLD',
      entry: null,
      stopLoss: null,
      takeProfit: null,
      positionSize: null,
      explanation: 'Insufficient data. Need at least 50 candles for strategy calculation.',
    };
  }
  
  const ema20 = getLatestEMA(candles, EMA_SHORT_PERIOD);
  const ema50 = getLatestEMA(candles, EMA_LONG_PERIOD);
  
  if (ema20 === null || ema50 === null) {
    return {
      action: 'HOLD',
      entry: null,
      stopLoss: null,
      takeProfit: null,
      positionSize: null,
      explanation: 'Unable to calculate EMA indicators.',
    };
  }
  
  const currentPrice = candles[candles.length - 1].close;
  const isBullish = isBullishStructure(candles);
  const isBearish = isBearishStructure(candles);
  
  if (ema20 > ema50 && isBullish) {
    const swingLow = findSwingLow(candles);
    if (swingLow === null || swingLow >= currentPrice) {
      return {
        action: 'HOLD',
        entry: null,
        stopLoss: null,
        takeProfit: null,
        positionSize: null,
        explanation: 'LONG signal detected but unable to determine valid stop loss level.',
      };
    }
    
    const entry = currentPrice;
    const stopLoss = swingLow;
    const risk = entry - stopLoss;
    const takeProfit = entry + (risk * RISK_REWARD_RATIO);
    const positionSize = calculatePositionSize(account, entry, stopLoss, 'LONG');
    
    return {
      action: 'LONG',
      entry,
      stopLoss,
      takeProfit,
      positionSize,
      explanation: generateExplanation('LONG', ema20, ema50, entry, stopLoss, takeProfit, positionSize),
    };
  }
  
  if (ema20 < ema50 && isBearish) {
    const swingHigh = findSwingHigh(candles);
    if (swingHigh === null || swingHigh <= currentPrice) {
      return {
        action: 'HOLD',
        entry: null,
        stopLoss: null,
        takeProfit: null,
        positionSize: null,
        explanation: 'SHORT signal detected but unable to determine valid stop loss level.',
      };
    }
    
    const entry = currentPrice;
    const stopLoss = swingHigh;
    const risk = stopLoss - entry;
    const takeProfit = entry - (risk * RISK_REWARD_RATIO);
    const positionSize = calculatePositionSize(account, entry, stopLoss, 'SHORT');
    
    return {
      action: 'SHORT',
      entry,
      stopLoss,
      takeProfit,
      positionSize,
      explanation: generateExplanation('SHORT', ema20, ema50, entry, stopLoss, takeProfit, positionSize),
    };
  }
  
  return {
    action: 'HOLD',
    entry: null,
    stopLoss: null,
    takeProfit: null,
    positionSize: null,
    explanation: generateExplanation('HOLD', ema20, ema50, null, null, null, null),
  };
}
