import { SuiClient } from '@mysten/sui/client';
import { suilendService } from './SuilendService';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔍 Checking where the $3 is...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  // Check pool balance
  const poolObj = await client.getObject({
    id: process.env.VITE_POOL_OBJECT_ID!,
    options: { showContent: true }
  });
  
  const fields = (poolObj.data?.content as any)?.fields;
  const poolBalance = parseInt(fields?.balance || '0') / 1_000_000;
  const totalDeposited = parseInt(fields?.total_deposited || '0') / 1_000_000;
  
  console.log('💰 OLD POOL:');
  console.log('   Balance in pool:', poolBalance.toFixed(2), 'USDC');
  console.log('   Total deposited:', totalDeposited.toFixed(2), 'USDC');
  
  // Check Suilend
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  await suilendService.initialize();
  const position = await suilendService.getUserPosition(keypair.toSuiAddress());
  
  const suilendBalance = position ? parseFloat(position.currentValue) / 1_000_000 : 0;
  
  console.log('\n💎 SUILEND:');
  console.log('   Balance:', suilendBalance.toFixed(2), 'USDC');
  
  console.log('\n📊 TOTAL:');
  console.log('   Pool + Suilend:', (poolBalance + suilendBalance).toFixed(2), 'USDC');
  
  if (poolBalance >= totalDeposited) {
    console.log('\n✅ All funds are in the pool! Users can withdraw now.');
  } else if (suilendBalance > 0) {
    console.log('\n⚠️  Funds still in Suilend, need to withdraw first.');
  } else {
    console.log('\n❌ Funds missing! Pool has', poolBalance, 'but should have', totalDeposited);
  }
  
  process.exit(0);
})();
