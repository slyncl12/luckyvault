import { withdrawCoinPTB, getPools } from '@naviprotocol/lending';
import { Transaction } from '@mysten/sui/transactions';

async function testWithdraw() {
  const pools = await getPools();
  const usdcPool = pools.find(p => p.token?.symbol === 'USDC');
  
  console.log('USDC Pool ID:', usdcPool?.id);
  console.log('Testing withdrawCoinPTB...');
  
  const tx = new Transaction();
  const result = withdrawCoinPTB(tx, usdcPool, 1000000);
  
  console.log('withdrawCoinPTB result type:', typeof result);
  console.log('Is array?', Array.isArray(result));
  console.log('Result:', result);
}

testWithdraw().catch(console.error);
