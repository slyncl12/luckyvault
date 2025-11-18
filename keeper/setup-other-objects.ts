import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔧 Creating DrawConfig, SuilendTracker...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const NEW_PACKAGE = process.env.VITE_NEW_PACKAGE_ID!;
  const NEW_ADMIN_CAP = process.env.VITE_NEW_ADMIN_CAP_ID!;
  
  const tx = new Transaction();
  
  // 1. Initialize Luck System (creates DrawConfig)
  tx.moveCall({
    target: `${NEW_PACKAGE}::lottery_personal::initialize_luck_system`,
    arguments: [
      tx.object(NEW_ADMIN_CAP),
    ],
  });
  
  // 2. Initialize SuilendTracker (needs Clock!)
  tx.moveCall({
    target: `${NEW_PACKAGE}::lottery_personal::initialize_suilend_tracker`,
    arguments: [
      tx.object(NEW_ADMIN_CAP),
      tx.object('0x6'), // Clock
    ],
  });
  
  console.log('🔄 Creating objects...');
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  
  console.log('\n✅ Objects created!');
  console.log('   Digest:', result.digest);
  
  const created = result.objectChanges?.filter(c => c.type === 'created');
  
  console.log('\n📋 NEW OBJECTS:');
  created?.forEach(obj => {
    if (obj.type === 'created') {
      const typeName = obj.objectType?.split('::').pop() || 'Unknown';
      console.log(`   ${typeName}: ${obj.objectId}`);
    }
  });
  
  console.log('\n📝 Save these IDs to .env!');
  
  process.exit(0);
})();
