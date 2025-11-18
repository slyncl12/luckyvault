import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🆕 Setting up NEW pool with withdrawal requests...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const NEW_PACKAGE = '0x4d1c2bed675acbfaaf713a4c1b9f7945db47d295660b46e248dd097f4814a427';
  const NEW_ADMIN_CAP = '0xf5bdba7c51f4ef1e7512e45d72976bc157f91d1d195e582b97cd251f70344012';
  const USDC_TYPE = process.env.VITE_USDC_TYPE!;
  
  // Whitelisted wallets (same as old pool)
  const WALLET1 = '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4';
  const WALLET2 = '0x041c09a3cde2713f5ea4e8b152c50f0516d2b22a51c15b73d39403eab00bbc84';
  
  console.log('📦 New Package:', NEW_PACKAGE);
  console.log('🔑 Admin Cap:', NEW_ADMIN_CAP);
  console.log('👥 Whitelisted Wallets:');
  console.log('   1:', WALLET1);
  console.log('   2:', WALLET2);
  
  const tx = new Transaction();
  
  // Create pool with correct arguments
  tx.moveCall({
    target: `${NEW_PACKAGE}::lottery_personal::create_pool`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(NEW_ADMIN_CAP),
      tx.pure.address(WALLET1),
      tx.pure.address(WALLET2),
      tx.object('0x6'), // Clock
    ],
  });
  
  console.log('\n🔄 Creating new pool...');
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  
  console.log('\n✅ Pool created!');
  console.log('   Digest:', result.digest);
  
  // Extract created objects
  const created = result.objectChanges?.filter(c => c.type === 'created');
  
  console.log('\n📋 NEW OBJECTS CREATED:');
  created?.forEach(obj => {
    if (obj.type === 'created') {
      const typeName = obj.objectType?.split('::').pop() || 'Unknown';
      console.log(`   ${typeName}: ${obj.objectId}`);
    }
  });
  
  console.log('\n📝 Next: Save the LotteryPool ID to .env as VITE_NEW_POOL_OBJECT_ID');
  
  process.exit(0);
})();
