import { TradingDefiSimulator } from '../simulator/simulator';
import { SimulatorConfig } from '../simulator/types';
import { Protocol } from '../defi/types';
import { Candle } from '../trading/types';

function generateTestCandles(startPrice: number, trend: 'bullish' | 'bearish' | 'sideways', count: number): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = startPrice;
  const baseTime = Date.now() - (count * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    let changePercent: number;
    switch (trend) {
      case 'bullish':
        changePercent = (Math.random() - 0.3) * 0.05;
        break;
      case 'bearish':
        changePercent = (Math.random() - 0.7) * 0.05;
        break;
      default:
        changePercent = (Math.random() - 0.5) * 0.02;
    }

    const open = currentPrice;
    const close = open * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
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

export function runSimulatorExample(): void {
  console.log('\n' + '═'.repeat(80));
  console.log('           ЗАГАЛЬНИЙ СИМУЛЯТОР ТРЕЙДИНГУ ТА DeFi');
  console.log('═'.repeat(80) + '\n');

  const config: SimulatorConfig = {
    initialBalance: 10000,
    tradingRiskPerTrade: 0.02,
    maxOpenTrades: 3,
    autoCloseOnTarget: true,
    enableDefi: true,
  };

  const simulator = new TradingDefiSimulator(config);

  console.log('📊 Початковий баланс: $' + config.initialBalance.toLocaleString());
  console.log('⚙️  Налаштування:');
  console.log(`   - Ризик на угоду: ${(config.tradingRiskPerTrade * 100).toFixed(1)}%`);
  console.log(`   - Макс. відкритих угод: ${config.maxOpenTrades}`);
  console.log(`   - Автозакриття на цілі: ${config.autoCloseOnTarget ? 'Так' : 'Ні'}`);
  console.log(`   - DeFi увімкнено: ${config.enableDefi ? 'Так' : 'Ні'}\n`);

  const protocols: Protocol[] = [
    {
      name: 'StakeTON Protocol',
      apy: 0.15,
      lockDays: 30,
      rewardToken: 'TON',
      rewardVolatility: 0.4,
      depositFee: 0.01,
    },
    {
      name: 'USDT Stable Vault',
      apy: 0.08,
      lockDays: 7,
      rewardToken: 'USDT',
      rewardVolatility: 0.05,
      depositFee: 0.005,
    },
    {
      name: 'ETH High Yield',
      apy: 0.22,
      lockDays: 90,
      rewardToken: 'ETH',
      rewardVolatility: 0.7,
      depositFee: 0.02,
    },
  ];

  console.log('─'.repeat(80));
  console.log('КРОК 1: Створення DeFi депозиту');
  console.log('─'.repeat(80));
  const bestProtocol = simulator.findBestDefiProtocol(protocols, 30, 'medium');
  if (bestProtocol) {
    console.log(`✅ Найкращий протокол: ${bestProtocol.protocol.name}`);
    console.log(`   Очікуваний прибуток: ${(bestProtocol.expectedProfitPercent * 100).toFixed(2)}%`);
    const depositAmount = 3000;
    const depositId = simulator.createDefiDeposit(bestProtocol.protocol, depositAmount, 30);
    if (depositId) {
      console.log(`✅ Створено DeFi депозит: $${depositAmount.toFixed(2)} на 30 днів\n`);
    }
  }

  console.log('─'.repeat(80));
  console.log('КРОК 2: Торгові угоди');
  console.log('─'.repeat(80));

  let allCandles: Candle[] = [];
  let currentPrice = 100;

  for (let i = 0; i < 10; i++) {
    const trend = i < 3 ? 'sideways' : i < 6 ? 'bullish' : 'bearish';
    const candles = generateTestCandles(currentPrice, trend, 60);
    allCandles = [...allCandles, ...candles];
    currentPrice = candles[candles.length - 1].close;
  }

  for (let i = 50; i < allCandles.length; i += 10) {
    const candles = allCandles.slice(0, i + 1);
    simulator.updateTrades(candles);
    simulator.updateDefiDeposits();

    const decision = simulator.generateTradeDecision(candles);
    if (decision.action !== 'HOLD') {
      const tradeId = simulator.openTrade(decision, candles[candles.length - 1].close);
      if (tradeId) {
        console.log(`✅ Відкрито ${decision.action} позицію @ $${decision.entry?.toFixed(2)}`);
      }
    }
  }

  simulator.updateTrades(allCandles);
  simulator.updateDefiDeposits();

  console.log('\n─'.repeat(80));
  console.log('КРОК 3: Фінальна статистика');
  console.log('─'.repeat(80));

  const stats = simulator.getStats();
  const portfolio = simulator.getPortfolio();

  console.log('\n💰 БАЛАНС:');
  console.log(`   Готівка: $${portfolio.cashBalance.toFixed(2)}`);
  console.log(`   Загальний баланс: $${simulator.getTotalBalance().toFixed(2)}`);
  console.log(`   Початковий баланс: $${config.initialBalance.toFixed(2)}`);
  console.log(`   Зміна: ${((simulator.getTotalBalance() / config.initialBalance - 1) * 100).toFixed(2)}%`);

  console.log('\n📊 ТОРГОВЛЯ:');
  console.log(`   Всього угод: ${stats.totalTrades}`);
  console.log(`   Прибуткових: ${stats.winningTrades}`);
  console.log(`   Збиткових: ${stats.losingTrades}`);
  console.log(`   Винрейт: ${stats.winRate.toFixed(2)}%`);
  console.log(`   Загальний PnL: $${stats.totalPnl.toFixed(2)} (${stats.totalPnlPercent.toFixed(2)}%)`);

  console.log('\n🏦 DeFi:');
  console.log(`   Загальний прибуток: $${stats.totalDefiProfit.toFixed(2)} (${stats.totalDefiProfitPercent.toFixed(2)}%)`);
  console.log(`   Активних депозитів: ${portfolio.activeDefiDeposits.length}`);

  console.log('\n📉 РИЗИКИ:');
  console.log(`   Макс. просідання: $${stats.maxDrawdown.toFixed(2)} (${stats.maxDrawdownPercent.toFixed(2)}%)`);
  console.log(`   Піковий баланс: $${stats.peakBalance.toFixed(2)}`);

  console.log('\n📝 Останні 5 операцій:');
  const recentOps = simulator.getOperations(5);
  recentOps.forEach((op, idx) => {
    const date = new Date(op.timestamp).toLocaleString();
    console.log(`   ${idx + 1}. [${date}] ${op.description}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('Симуляція завершена!');
  console.log('═'.repeat(80) + '\n');
}
