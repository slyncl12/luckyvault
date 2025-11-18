import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

async function findNaviDeposit() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const address = '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382';
  
  // Get recent transactions
  const txs = await client.queryTransactionBlocks({
    filter: { FromAddress: address },
    options: { showEffects: true, showObjectChanges: true, showBalanceChanges: true },
    limit: 20,
    order: 'descending'
  });
  
  console.log('Recent transactions:');
  for (const tx of txs.data) {
    const usdcChange = tx.balanceChanges?.find(bc => bc.coinType.includes('usdc'));
    if (usdcChange) {
      console.log('\n---');
      console.log('Digest:', tx.digest);
      console.log('Time:', new Date(parseInt(tx.timestampMs!)).toLocaleString());
      console.log('USDC Change:', parseInt(usdcChange.amount) / 1_000_000);
      
      // Check if it involves NAVI
      const hasNavi = JSON.stringify(tx).toLowerCase().includes('navi');
      if (hasNavi) {
        console.log('🎯 INVOLVES NAVI!');
      }
    }
  }
}

findNaviDeposit().catch(console.error);
