export type RewardToken = 'USDT' | 'TON' | 'ETH';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Protocol {
  name: string;
  apy: number;
  lockDays: number;
  rewardToken: RewardToken;
  rewardVolatility: number;
  depositFee: number;
}

export interface UserDeposit {
  amount: number;
  horizonDays: number;
  riskLevel: RiskLevel;
}

export interface OptimizationResult {
  protocol: Protocol;
  expectedProfitPercent: number;
  expectedProfitAbsolute: number;
  riskScore: number;
  explanation: string;
}
