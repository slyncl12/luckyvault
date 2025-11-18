import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  const poolObj = await client.getObject({
    id: process.env.VITE_POOL_OBJECT_ID!,
    options: { showContent: true }
  });
  
  const fields = (poolObj.data?.content as any)?.fields;
  
  console.log('📊 Pool State:');
  console.log('   Pool Balance:', parseInt(fields?.balance || '0') / 1_000_000, 'USDC');
  console.log('   Total Deposited:', parseInt(fields?.total_deposited || '0') / 1_000_000, 'USDC');
  console.log('\n👥 User Deposits (correct field):');
  
  const deposits = fields?.user_deposits?.fields?.contents || [];
  deposits.forEach((entry: any) => {
    const addr = entry.fields.key;
    const bal = parseInt(entry.fields.value) / 1_000_000;
    console.log(`   ${addr}: $${bal.toFixed(2)}`);
  });
  
  console.log('\n🔍 All Pool Fields:');
  console.log(Object.keys(fields));
  
  process.exit(0);
})();
