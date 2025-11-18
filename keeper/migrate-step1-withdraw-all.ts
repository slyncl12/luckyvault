import { suilendService } from './SuilendService';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('📤 Step 1: Withdraw ALL funds from Suilend to old pool\n');
  
  const suiClient = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  // Load key exactly as index.ts does
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  
  // Skip first byte if it's 33 bytes (SUI adds a version prefix)
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  console.log('👤 Admin Address:', keypair.toSuiAddress());
  
  await suilendService.initialize();
  
  const position = await suilendService.getUserPosition(keypair.toSuiAddress());
  
  if (!position) {
    console.log('❌ No Suilend position found');
    process.exit(1);
  }
  
  const amount = parseFloat(position.currentValue) / 1_000_000;
  console.log('💰 Suilend Balance:', amount.toFixed(2), 'USDC');
  console.log('📍 Obligation ID:', position.obligationId);
  
  console.log('\n💸 Withdrawing ALL funds from Suilend...');
  
  // Create transaction
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::admin_deposit_from_suilend`,
    typeArguments: [process.env.VITE_USDC_TYPE!],
    arguments: [
      tx.object(process.env.VITE_ADMIN_CAP_ID!),
      tx.object(process.env.VITE_POOL_OBJECT_ID!),
      tx.object(process.env.VITE_SUILEND_TRACKER_ID!),
      tx.pure.u64(Math.floor(amount * 1_000_000)), // Withdraw all
      tx.object(position.obligationId),
      tx.object('0x6'),
    ],
  });
  
  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  
  console.log('✅ Withdrawal successful!');
  console.log('   Digest:', result.digest);
  console.log('\n🎯 Next: Users can now withdraw from old pool!');
  
  process.exit(0);
})();
