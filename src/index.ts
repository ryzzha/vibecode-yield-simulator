import { runDeFiExample } from './examples/defiExample';
import { runTradingExample } from './examples/tradingExample';
import { runSimulatorExample } from './examples/simulatorExample';

function main(): void {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    DeFi + Trading Ecosystem Simulator                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  
  runSimulatorExample();
  
  console.log('\n' + '═'.repeat(80));
  console.log(':)');
  console.log('═'.repeat(80) + '\n');
}

main();
