import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔍 Investigating missing $3...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  // Check tracker
  const tracker = await client.getObject({
    id: process.env.VITE_SUILEND_TRACKER_ID!,
    options: { showContent: true }
  });
  
  const trackerFields = (tracker.data?.content as any)?.fields;
  
  console.log('📊 TRACKER STATE:');
  console.log('   Deposited to Suilend:', parseInt(trackerFields?.deposited_to_suilend || '0') / 1_000_000, 'USDC');
  console.log('   Obligation:', trackerFields?.obligation_id);
  
  // Get recent transactions on the pool
  console.log('\n📜 Recent pool transactions:');
  const txs = await client.queryTransactionBlocks({
    filter: {
      InputObject: process.env.VITE_POOL_OBJECT_ID!,
    },
    order: 'descending',
    limit: 10,
  });
  
  for (const tx of txs.data) {
    console.log('   -', tx.digest, 'at', new Date(parseInt(tx.timestampMs!)).toISOString());
  }
  
  process.exit(0);
})();
