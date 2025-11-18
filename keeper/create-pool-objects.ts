import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';
dotenv.config();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const ADMIN_CAP_ID = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';

async function createPoolObjects() {
  console.log('🏗️  Creating Pool Objects\n');
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  const secretKeyBase64 = process.env.VITE_NEW_ADMIN_SECRET_KEY || process.env.VITE_ADMIN_SECRET_KEY;
  if (!secretKeyBase64) throw new Error('❌ No admin secret key');
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  const adminAddress = keypair.toSuiAddress();

  console.log('📦 Package:', PACKAGE_ID);
  console.log('🔑 AdminCap:', ADMIN_CAP_ID);
  console.log('👤 Admin:', adminAddress);
  console.log('');

  // Step 1: DrawConfig (already created - reuse it)
  const drawConfigId = '0x0a351e8aaf06312eaa62a009ccb39f51e57f5f28e4ce799fd3413177bd50e60a';
  console.log('✅ DrawConfig (already created):', drawConfigId);
  console.log('');

  // Step 2: JackpotTiers
  console.log('Step 2: Initializing Jackpot Tiers...');
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::initialize_jackpot_tiers`,
    typeArguments: [USDC_TYPE],
    arguments: [tx2.object(ADMIN_CAP_ID), tx2.object(CLOCK_ID)]
  });
  const result2 = await client.signAndExecuteTransaction({
    transaction: tx2, signer: keypair,
    options: { showEffects: true, showObjectChanges: true }
  });
  const jackpotTiers = result2.objectChanges?.find((obj: any) =>
    obj.type === 'created' && obj.objectType?.includes('JackpotTiers')
  );
  if (!jackpotTiers) throw new Error('❌ JackpotTiers failed');
  console.log('   ✅ JackpotTiers:', jackpotTiers.objectId);
  await sleep(3000);
  console.log('');

  // Step 3: NAVI Tracker
  console.log('Step 3: Initializing NAVI Tracker...');
  const tx3 = new Transaction();
  tx3.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::initialize_suilend_tracker`,
    arguments: [tx3.object(ADMIN_CAP_ID), tx3.object(CLOCK_ID)]
  });
  const result3 = await client.signAndExecuteTransaction({
    transaction: tx3, signer: keypair,
    options: { showEffects: true, showObjectChanges: true }
  });
  const naviTracker = result3.objectChanges?.find((obj: any) =>
    obj.type === 'created' && obj.objectType?.includes('SuilendTracker')
  );
  if (!naviTracker) throw new Error('❌ Tracker failed');
  console.log('   ✅ NAVI Tracker:', naviTracker.objectId);
  await sleep(3000);
  console.log('');

  // Step 4: Pool
  console.log('Step 4: Creating Pool...');
  const tx4 = new Transaction();
  tx4.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::create_pool`,
    typeArguments: [USDC_TYPE],
    arguments: [tx4.object(ADMIN_CAP_ID), tx4.pure.address(adminAddress), tx4.pure.address('0x0000000000000000000000000000000000000000000000000000000000000001'), tx4.object(CLOCK_ID)]
  });
  const result4 = await client.signAndExecuteTransaction({
    transaction: tx4, signer: keypair,
    options: { showEffects: true, showObjectChanges: true }
  });
  const pool = result4.objectChanges?.find((obj: any) =>
    obj.type === 'created' && obj.objectType?.includes('LotteryPool')
  );
  if (!pool) throw new Error('❌ Pool failed');
  console.log('   ✅ Pool:', pool.objectId);
  await sleep(3000);
  console.log('');

  // Step 5: Whitelist
  console.log('Step 5: Adding admin to whitelist...');
  const tx5 = new Transaction();
  tx5.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::add_to_whitelist`,
    typeArguments: [USDC_TYPE],
    arguments: [tx5.object(ADMIN_CAP_ID), tx5.object(pool.objectId), tx5.pure.address(adminAddress), tx5.object(CLOCK_ID)]
  });
  await client.signAndExecuteTransaction({ transaction: tx5, signer: keypair, options: { showEffects: true }});
  console.log('   ✅ Whitelisted');
  console.log('');

  console.log('🎉 COMPLETE!\n');
  console.log('VITE_PACKAGE_ID=' + PACKAGE_ID);
  console.log('VITE_ADMIN_CAP_ID=' + ADMIN_CAP_ID);
  console.log('VITE_POOL_OBJECT_ID=' + pool.objectId);
  console.log('VITE_DRAW_CONFIG_ID=' + drawConfigId);
  console.log('VITE_JACKPOT_TIERS_ID=' + jackpotTiers.objectId);
  console.log('VITE_NAVI_TRACKER_ID=' + naviTracker.objectId);
  console.log('VITE_SUILEND_TRACKER_ID=' + naviTracker.objectId);
}

createPoolObjects().catch(console.error);
