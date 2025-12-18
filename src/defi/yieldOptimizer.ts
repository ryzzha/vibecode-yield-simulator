import { Protocol, UserDeposit, OptimizationResult, RiskLevel } from './types';

function calculateRiskAdjustment(riskLevel: RiskLevel, volatility: number): number {
  const volatilityPenalty = volatility * 0.5;
  
  switch (riskLevel) {
    case 'low':
      return 1 - (volatilityPenalty * 2);
    case 'medium':
      return 1 - volatilityPenalty;
    case 'high':
      return 1 - (volatilityPenalty * 0.3);
    default:
      return 1;
  }
}

function calculateLockPenalty(lockDays: number, horizonDays: number): number {
  if (lockDays <= horizonDays) {
    return 1;
  }
  
  const excessDays = lockDays - horizonDays;
  const penaltyFactor = Math.min(excessDays / horizonDays, 1);
  return 1 - (penaltyFactor * 0.5);
}

function calculateExpectedYield(
  protocol: Protocol,
  deposit: UserDeposit
): { profitPercent: number; profitAbsolute: number } {
  const baseYieldPercent = protocol.apy * (deposit.horizonDays / 365);
  
  const riskAdjustment = calculateRiskAdjustment(deposit.riskLevel, protocol.rewardVolatility);
  const adjustedYieldPercent = baseYieldPercent * riskAdjustment;
  
  const lockPenalty = calculateLockPenalty(protocol.lockDays, deposit.horizonDays);
  const yieldAfterLockPenalty = adjustedYieldPercent * lockPenalty;
  
  const finalYieldPercent = yieldAfterLockPenalty - protocol.depositFee;
  
  const profitAbsolute = deposit.amount * finalYieldPercent;
  
  return {
    profitPercent: finalYieldPercent,
    profitAbsolute,
  };
}

function calculateRiskScore(protocol: Protocol, deposit: UserDeposit): number {
  const volatilityScore = protocol.rewardVolatility * 50;
  const lockRiskScore = protocol.lockDays > deposit.horizonDays 
    ? Math.min((protocol.lockDays - deposit.horizonDays) / deposit.horizonDays * 30, 30)
    : 0;
  const feeScore = protocol.depositFee * 20;
  
  return volatilityScore + lockRiskScore + feeScore;
}

function generateExplanation(
  protocol: Protocol,
  deposit: UserDeposit,
  profitPercent: number
): string {
  const parts: string[] = [];
  
  parts.push(`Protocol "${protocol.name}" offers ${(protocol.apy * 100).toFixed(2)}% APY`);
  
  if (deposit.riskLevel === 'low' && protocol.rewardVolatility > 0.3) {
    parts.push(`but high volatility (${(protocol.rewardVolatility * 100).toFixed(1)}%) is penalized for low-risk profile`);
  } else if (deposit.riskLevel === 'high' && protocol.rewardVolatility > 0.5) {
    parts.push(`with high volatility (${(protocol.rewardVolatility * 100).toFixed(1)}%) acceptable for high-risk profile`);
  }
  
  if (protocol.lockDays > deposit.horizonDays) {
    parts.push(`Lock period (${protocol.lockDays} days) exceeds investment horizon (${deposit.horizonDays} days), applying penalty`);
  }
  
  if (protocol.depositFee > 0) {
    parts.push(`Deposit fee of ${(protocol.depositFee * 100).toFixed(2)}% reduces returns`);
  }
  
  parts.push(`Expected profit: ${(profitPercent * 100).toFixed(2)}% over ${deposit.horizonDays} days`);
  
  return parts.join('. ') + '.';
}

export function optimizeYield(
  protocols: Protocol[],
  deposit: UserDeposit
): OptimizationResult[] {
  const results: OptimizationResult[] = protocols.map((protocol) => {
    const { profitPercent, profitAbsolute } = calculateExpectedYield(protocol, deposit);
    const riskScore = calculateRiskScore(protocol, deposit);
    const explanation = generateExplanation(protocol, deposit, profitPercent);
    
    return {
      protocol,
      expectedProfitPercent: profitPercent,
      expectedProfitAbsolute: profitAbsolute,
      riskScore,
      explanation,
    };
  });
  
  return results.sort((a, b) => b.expectedProfitPercent - a.expectedProfitPercent);
}

export function getBestProtocol(results: OptimizationResult[]): OptimizationResult | null {
  return results.length > 0 ? results[0] : null;
}
