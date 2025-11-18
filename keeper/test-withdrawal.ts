import { suilendService } from './SuilendService';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🧪 Testing Suilend withdrawal...\n');
  
  const suiClient = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  const keypair = Ed25519Keypair.fromSecretKey(
    Uint8Array.from(Buffer.from(process.env.VITE_ADMIN_SECRET_KEY!, 'base64'))
  );
  
  await suilendService.initialize();
  
  // Check position
  const position = await suilendService.getUserPosition(keypair.toSuiAddress());
  
  if (!position) {
    console.log('❌ No Suilend position found');
    process.exit(1);
  }
  
  console.log('📊 Current Position:');
  console.log('   Value:', (parseFloat(position.currentValue) / 1_000_000).toFixed(2), 'USDC');
  console.log('   Obligation ID:', position.obligationId);
  
  // Try to withdraw $0.01
  console.log('\n💸 Attempting to withdraw $0.01...');
  
  try {
    const tx = await suilendService.withdrawUSDC(
      keypair.toSuiAddress(),
      0.01,
      position.obligationId
    );
    
    console.log('✅ Transaction created successfully');
    console.log('   Transaction object:', tx);
    
    // Execute it
    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    console.log('✅ Withdrawal executed!');
    console.log('   Digest:', result.digest);
    console.log('   Status:', result.effects?.status);
    
  } catch (error) {
    console.error('❌ Withdrawal failed:', error);
    console.error('   Stack:', error.stack);
  }
  
  process.exit(0);
})();
