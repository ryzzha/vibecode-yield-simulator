import { Candle } from './types';

export function calculateEMA(candles: Candle[], period: number): number[] {
  if (candles.length === 0) {
    return [];
  }
  
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < Math.min(period, candles.length); i++) {
    sum += candles[i].close;
  }
  
  if (candles.length < period) {
    return [sum / candles.length];
  }
  
  ema[period - 1] = sum / period;
  
  for (let i = period; i < candles.length; i++) {
    ema[i] = (candles[i].close - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

export function getLatestEMA(candles: Candle[], period: number): number | null {
  const ema = calculateEMA(candles, period);
  return ema.length > 0 ? ema[ema.length - 1] : null;
}

export function isBullishStructure(candles: Candle[], lookback: number = 5): boolean {
  if (candles.length < lookback * 2) {
    return false;
  }
  
  const recent = candles.slice(-lookback);
  const previous = candles.slice(-lookback * 2, -lookback);
  
  const recentHigh = Math.max(...recent.map(c => c.high));
  const previousHigh = Math.max(...previous.map(c => c.high));
  const recentLow = Math.min(...recent.map(c => c.low));
  const previousLow = Math.min(...previous.map(c => c.low));
  
  return recentHigh > previousHigh && recentLow > previousLow;
}

export function isBearishStructure(candles: Candle[], lookback: number = 5): boolean {
  if (candles.length < lookback * 2) {
    return false;
  }
  
  const recent = candles.slice(-lookback);
  const previous = candles.slice(-lookback * 2, -lookback);
  
  const recentHigh = Math.max(...recent.map(c => c.high));
  const previousHigh = Math.max(...previous.map(c => c.high));
  const recentLow = Math.min(...recent.map(c => c.low));
  const previousLow = Math.min(...previous.map(c => c.low));
  
  return recentHigh < previousHigh && recentLow < previousLow;
}

export function findSwingHigh(candles: Candle[], lookback: number = 20): number | null {
  if (candles.length < lookback) {
    return null;
  }
  
  const recent = candles.slice(-lookback);
  return Math.max(...recent.map(c => c.high));
}

export function findSwingLow(candles: Candle[], lookback: number = 20): number | null {
  if (candles.length < lookback) {
    return null;
  }
  
  const recent = candles.slice(-lookback);
  return Math.min(...recent.map(c => c.low));
}
