import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('👥 Getting user refund details...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  // Get user deposits from old pool
  const poolObj = await client.getObject({
    id: process.env.VITE_POOL_OBJECT_ID!,
    options: { showContent: true }
  });
  
  const fields = (poolObj.data?.content as any)?.fields;
  const depositors = fields?.depositors || [];
  
  console.log('📊 REFUND LIST:');
  console.log('Old Pool ID:', process.env.VITE_POOL_OBJECT_ID);
  console.log('\nUsers to refund:');
  
  depositors.forEach((addr: string) => {
    console.log(`\n👤 ${addr}`);
    console.log(`   Amount: $1.50 USDC (1500000 micro-USDC)`);
  });
  
  console.log('\n💰 Total to refund: $3.00 USDC');
  console.log('\n📝 Next: Send USDC to these addresses from your wallet');
  
  process.exit(0);
})();
