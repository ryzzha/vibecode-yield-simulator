import { Protocol, UserDeposit } from '../defi/types';
import { optimizeYield, getBestProtocol } from '../defi/yieldOptimizer';

/**
 * Example usage of DeFi Yield Optimizer
 */
export function runDeFiExample(): void {
  console.log('\n=== DeFi Yield Optimizer Example ===\n');
  
  // Mock protocols
  const protocols: Protocol[] = [
    {
      name: 'StakeTON Protocol',
      apy: 0.15, // 15% APY
      lockDays: 30,
      rewardToken: 'TON',
      rewardVolatility: 0.4,
      depositFee: 0.01, // 1%
    },
    {
      name: 'USDT Stable Vault',
      apy: 0.08, // 8% APY
      lockDays: 7,
      rewardToken: 'USDT',
      rewardVolatility: 0.05,
      depositFee: 0.005, // 0.5%
    },
    {
      name: 'ETH High Yield',
      apy: 0.22, // 22% APY
      lockDays: 90,
      rewardToken: 'ETH',
      rewardVolatility: 0.7,
      depositFee: 0.02, // 2%
    },
    {
      name: 'TON Flexible',
      apy: 0.12, // 12% APY
      lockDays: 0,
      rewardToken: 'TON',
      rewardVolatility: 0.35,
      depositFee: 0.0,
    },
  ];
  
  // User deposit scenarios
  const scenarios: UserDeposit[] = [
    {
      amount: 10000,
      horizonDays: 30,
      riskLevel: 'low',
    },
    {
      amount: 50000,
      horizonDays: 60,
      riskLevel: 'medium',
    },
    {
      amount: 25000,
      horizonDays: 90,
      riskLevel: 'high',
    },
  ];
  
  scenarios.forEach((deposit, index) => {
    console.log(`\n--- Scenario ${index + 1} ---`);
    console.log(`Deposit: $${deposit.amount.toLocaleString()}`);
    console.log(`Horizon: ${deposit.horizonDays} days`);
    console.log(`Risk Level: ${deposit.riskLevel.toUpperCase()}`);
    console.log('\nOptimization Results:');
    console.log('─'.repeat(80));
    
    const results = optimizeYield(protocols, deposit);
    
    results.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.protocol.name}`);
      console.log(`   Expected Profit: ${(result.expectedProfitPercent * 100).toFixed(2)}% ($${result.expectedProfitAbsolute.toFixed(2)})`);
      console.log(`   Risk Score: ${result.riskScore.toFixed(2)}/100`);
      console.log(`   Explanation: ${result.explanation}`);
    });
    
    const best = getBestProtocol(results);
    if (best) {
      console.log('\n' + '═'.repeat(80));
      console.log('🏆 BEST PROTOCOL:', best.protocol.name);
      console.log(`   Expected Profit: ${(best.expectedProfitPercent * 100).toFixed(2)}% ($${best.expectedProfitAbsolute.toFixed(2)})`);
      console.log(`   Risk Score: ${best.riskScore.toFixed(2)}/100`);
      console.log(`   ${best.explanation}`);
      console.log('═'.repeat(80));
    }
  });
}

