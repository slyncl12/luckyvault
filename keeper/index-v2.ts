import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';
import { WithdrawalFulfiller } from './WithdrawalFulfiller';

dotenv.config();

async function main() {
  console.log('🚀 LuckyVault Keeper V2 Starting...\n');
  
  // Load admin keypair
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const adminKeypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  const adminAddress = adminKeypair.toSuiAddress();
  
  console.log('👤 Admin Address:', adminAddress);
  
  // Initialize SUI client
  const suiClient = new SuiClient({ 
    url: process.env.VITE_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io' 
  });
  
  // New contract IDs
  const NEW_PACKAGE = process.env.VITE_NEW_PACKAGE_ID!;
  const NEW_ADMIN_CAP = process.env.VITE_NEW_ADMIN_CAP_ID!;
  const NEW_POOL = process.env.VITE_NEW_POOL_OBJECT_ID!;
  
  console.log('\n📦 Contract V2:');
  console.log('   Package:', NEW_PACKAGE);
  console.log('   Pool:', NEW_POOL);
  console.log('   Admin Cap:', NEW_ADMIN_CAP);
  
  // Start withdrawal fulfiller
  const fulfiller = new WithdrawalFulfiller(
    suiClient,
    adminKeypair,
    NEW_PACKAGE,
    NEW_ADMIN_CAP,
    NEW_POOL
  );
  
  await fulfiller.start();
  
  console.log('\n✅ Keeper V2 is running!');
  console.log('   Monitoring withdrawal requests...');
  console.log('   Press Ctrl+C to stop');
}

main().catch(console.error);
