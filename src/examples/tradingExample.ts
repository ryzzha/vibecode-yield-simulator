import { Candle, Account } from '../trading/types';
import { generateTradeDecision } from '../trading/strategyEngine';

/**
 * Generates mock candle data with a trend
 */
function generateMockCandles(
  startPrice: number,
  trend: 'bullish' | 'bearish' | 'sideways',
  count: number
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = startPrice;
  const baseTime = Date.now() - (count * 60 * 60 * 1000); // 1 hour candles
  const minPrice = startPrice * 0.1; // Ensure price doesn't drop below 10% of start
  
  for (let i = 0; i < count; i++) {
    let changePercent: number;
    
    switch (trend) {
      case 'bullish':
        changePercent = (Math.random() - 0.3) * 0.05; // Bias upward, ~-1.5% to +3.5%
        break;
      case 'bearish':
        changePercent = (Math.random() - 0.7) * 0.05; // Bias downward, ~-3.5% to +1.5%
        break;
      default:
        changePercent = (Math.random() - 0.5) * 0.02; // Sideways, ~-1% to +1%
    }
    
    const open = currentPrice;
    const close = Math.max(minPrice, open * (1 + changePercent));
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.max(minPrice, Math.min(open, close) * (1 - Math.random() * 0.02));
    const volume = 1000 + Math.random() * 5000;
    
    candles.push({
      time: baseTime + (i * 60 * 60 * 1000),
      open,
      high,
      low,
      close,
      volume,
    });
    
    currentPrice = close;
  }
  
  return candles;
}

/**
 * Example usage of Trading Strategy Engine
 */
export function runTradingExample(): void {
  console.log('\n=== Trading Strategy Engine Example ===\n');
  
  const account: Account = {
    balance: 10000,
    riskPerTrade: 0.02, // 2% risk per trade
  };
  
  console.log(`Account Balance: $${account.balance.toLocaleString()}`);
  console.log(`Risk Per Trade: ${(account.riskPerTrade * 100).toFixed(1)}%\n`);
  
  // Scenario 1: Bullish trend
  console.log('─'.repeat(80));
  console.log('SCENARIO 1: Bullish Trend');
  console.log('─'.repeat(80));
  const bullishCandles = generateMockCandles(100, 'bullish', 100);
  const bullishDecision = generateTradeDecision(bullishCandles, account);
  
  console.log(`Current Price: $${bullishCandles[bullishCandles.length - 1].close.toFixed(2)}`);
  console.log(`Decision: ${bullishDecision.action}`);
  if (bullishDecision.entry !== null) {
    console.log(`Entry: $${bullishDecision.entry.toFixed(2)}`);
    console.log(`Stop Loss: $${bullishDecision.stopLoss?.toFixed(2)}`);
    console.log(`Take Profit: $${bullishDecision.takeProfit?.toFixed(2)}`);
    console.log(`Position Size: ${bullishDecision.positionSize?.toFixed(4)} units`);
    if (bullishDecision.positionSize !== null && bullishDecision.entry !== null) {
      const positionValue = bullishDecision.positionSize * bullishDecision.entry;
      console.log(`Position Value: $${positionValue.toFixed(2)}`);
    }
  }
  console.log(`Explanation: ${bullishDecision.explanation}\n`);
  
  // Scenario 2: Bearish trend
  console.log('─'.repeat(80));
  console.log('SCENARIO 2: Bearish Trend');
  console.log('─'.repeat(80));
  const bearishCandles = generateMockCandles(150, 'bearish', 100);
  const bearishDecision = generateTradeDecision(bearishCandles, account);
  
  console.log(`Current Price: $${bearishCandles[bearishCandles.length - 1].close.toFixed(2)}`);
  console.log(`Decision: ${bearishDecision.action}`);
  if (bearishDecision.entry !== null) {
    console.log(`Entry: $${bearishDecision.entry.toFixed(2)}`);
    console.log(`Stop Loss: $${bearishDecision.stopLoss?.toFixed(2)}`);
    console.log(`Take Profit: $${bearishDecision.takeProfit?.toFixed(2)}`);
    console.log(`Position Size: ${bearishDecision.positionSize?.toFixed(4)} units`);
    if (bearishDecision.positionSize !== null && bearishDecision.entry !== null) {
      const positionValue = bearishDecision.positionSize * bearishDecision.entry;
      console.log(`Position Value: $${positionValue.toFixed(2)}`);
    }
  }
  console.log(`Explanation: ${bearishDecision.explanation}\n`);
  
  // Scenario 3: Sideways market
  console.log('─'.repeat(80));
  console.log('SCENARIO 3: Sideways Market');
  console.log('─'.repeat(80));
  const sidewaysCandles = generateMockCandles(120, 'sideways', 100);
  const sidewaysDecision = generateTradeDecision(sidewaysCandles, account);
  
  console.log(`Current Price: $${sidewaysCandles[sidewaysCandles.length - 1].close.toFixed(2)}`);
  console.log(`Decision: ${sidewaysDecision.action}`);
  console.log(`Explanation: ${sidewaysDecision.explanation}\n`);
  
  // Scenario 4: Insufficient data
  console.log('─'.repeat(80));
  console.log('SCENARIO 4: Insufficient Data');
  console.log('─'.repeat(80));
  const fewCandles = generateMockCandles(100, 'bullish', 30);
  const fewDecision = generateTradeDecision(fewCandles, account);
  
  console.log(`Candles Available: ${fewCandles.length}`);
  console.log(`Decision: ${fewDecision.action}`);
  console.log(`Explanation: ${fewDecision.explanation}\n`);
}

