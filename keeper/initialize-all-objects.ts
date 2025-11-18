import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

async function initializeAll() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));

  const PACKAGE_ID = process.env.VITE_PACKAGE_ID!;
  const ADMIN_CAP_ID = process.env.VITE_ADMIN_CAP_ID!;
  const CLOCK_ID = '0x6';
  const USDC_TYPE = process.env.VITE_USDC_TYPE!;

  console.log('Creating all required shared objects...\n');

  // 1. Create DrawConfig
  console.log('1️⃣ Creating DrawConfig...');
  const tx1 = new Transaction();
  tx1.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::initialize_luck_system`,
    arguments: [
      tx1.object(ADMIN_CAP_ID),
    ],
  });
  tx1.setGasBudget(100000000);

  const result1 = await client.signAndExecuteTransaction({
    transaction: tx1,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const drawConfig = result1.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('DrawConfig')
  );
  console.log('✅ DrawConfig created:', drawConfig?.objectId);

  // 2. Create JackpotTiers
  console.log('\n2️⃣ Creating JackpotTiers...');
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::initialize_jackpot_tiers`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx2.object(ADMIN_CAP_ID),
      tx2.object(CLOCK_ID),
    ],
  });
  tx2.setGasBudget(100000000);

  const result2 = await client.signAndExecuteTransaction({
    transaction: tx2,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const jackpotTiers = result2.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('JackpotTiers')
  );
  console.log('✅ JackpotTiers created:', jackpotTiers?.objectId);

  // 3. Create MegaPool
  console.log('\n3️⃣ Creating MegaPool...');
  const tx3 = new Transaction();
  tx3.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::initialize_mega_pool`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx3.object(ADMIN_CAP_ID),
    ],
  });
  tx3.setGasBudget(100000000);

  const result3 = await client.signAndExecuteTransaction({
    transaction: tx3,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  const megaPool = result3.objectChanges?.find((obj: any) => 
    obj.type === 'created' && obj.objectType?.includes('MegaPool')
  );
  console.log('✅ MegaPool created:', megaPool?.objectId);

  console.log('\n📋 Summary - Add these to your .env files:');
  console.log(`VITE_DRAW_CONFIG_ID=${drawConfig?.objectId}`);
  console.log(`VITE_JACKPOT_TIERS_ID=${jackpotTiers?.objectId}`);
  console.log(`VITE_MEGA_POOL_ID=${megaPool?.objectId}`);
}

initializeAll().catch(console.error);
