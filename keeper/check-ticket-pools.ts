import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });
  
  const ADMIN = '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4';
  const NEW_POOL = '0xc7d45a940c061bde2865979f9bb61a8b0f0d643582093be7c55ee7a87ec6d86f';
  
  const objects = await client.getOwnedObjects({
    owner: ADMIN,
    filter: {
      StructType: '0x4d1c2bed675acbfaaf713a4c1b9f7945db47d295660b46e248dd097f4814a427::lottery_personal::Ticket'
    },
    options: { showContent: true }
  });
  
  console.log('🎫 Tickets found:', objects.data.length);
  
  objects.data.forEach((obj, i) => {
    const fields = (obj.data?.content as any)?.fields;
    const poolId = fields?.pool_id;
    const amount = (parseInt(fields?.amount || '0') / 1_000_000).toFixed(2);
    const isNew = poolId === NEW_POOL;
    
    console.log(`\n${i+1}. $${amount} - Pool: ${poolId?.slice(0, 10)}... ${isNew ? '✅ NEW' : '❌ OLD'}`);
  });
  
  process.exit(0);
})();
