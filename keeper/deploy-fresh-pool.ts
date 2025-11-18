/**
 * Deploy Fresh LuckyVault Pool - Creates NEW shared objects
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const ADMIN_CAP_ID = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';

// Already created
const NAVI_TRACKER_ID = '0x37d6594ff75f05543b5f82d7d296e7c20517bd82cf5d08b44a971856a8cb11ae';

async function deployFreshPool() {
  console.log('🚀 Continuing Fresh Pool Deployment\n');
  console.log('✅ NAVI Tracker already created:', NAVI_TRACKER_ID);
  console.log('');

  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });

  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  if (!secretKeyBase64) {
    throw new Error('❌ No admin secret key found in .env');
  }

  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  const adminAddress = keypair.toSuiAddress();

  console.log('📦 Package:', PACKAGE_ID);
  console.log('👤 Admin:', adminAddress);
  console.log('');

  // Check the failed pool transaction
  console.log('🔍 Checking previous pool transaction...');
  const poolTxResult = await client.getTransactionBlock({
    digest: 'J8dRbBhtJ4MJzjswcUFToQWvhqowzCTTYjQK2GHLNKfu',
    options: { showObjectChanges: true }
  });

  console.log('Object changes:', JSON.stringify(poolTxResult.objectChanges, null, 2));

  // Find the pool from that transaction
  const allChanges = poolTxResult.objectChanges || [];
  const poolObj = allChanges.find((obj: any) => 
    obj.objectType?.includes('LotteryPool')
  );

  if (poolObj && 'objectId' in poolObj) {
    console.log('   ✅ Found Pool from previous tx:', poolObj.objectId);
    console.log('');

    // Continue with remaining objects
    console.log('Step 3: Creating JackpotTiers...');

    const tiersTx = new Transaction();
    tiersTx.moveCall({
      target: `${PACKAGE_ID}::lottery_personal::initialize_jackpot_tiers`,
      typeArguments: [USDC_TYPE],
      arguments: [
        tiersTx.object(ADMIN_CAP_ID),
        tiersTx.object(CLOCK_ID)
      ]
    });
    tiersTx.setGasBudget(100000000);

    const tiersResult = await client.signAndExecuteTransaction({
      transaction: tiersTx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

    console.log('   ✅ Transaction:', tiersResult.digest);

    const tiersCreated = tiersResult.objectChanges?.filter((obj: any) => obj.type === 'created') || [];
    const jackpotTiers = tiersCreated.find((obj: any) => obj.objectType?.includes('JackpotTiers'));

    if (!jackpotTiers) {
      throw new Error('❌ Failed to create JackpotTiers');
    }

    console.log('   ✅ JackpotTiers:', jackpotTiers.objectId);
    console.log('');

    // Step 4: Create DrawConfig
    console.log('Step 4: Creating DrawConfig...');

    const drawTx = new Transaction();
    drawTx.moveCall({
      target: `${PACKAGE_ID}::lottery_personal::initialize_luck_system`,
      arguments: [
        drawTx.object(ADMIN_CAP_ID)
      ]
    });
    drawTx.setGasBudget(100000000);

    const drawResult = await client.signAndExecuteTransaction({
      transaction: drawTx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

    console.log('   ✅ Transaction:', drawResult.digest);

    const drawCreated = drawResult.objectChanges?.filter((obj: any) => obj.type === 'created') || [];
    const drawConfig = drawCreated.find((obj: any) => obj.objectType?.includes('DrawConfig'));

    if (!drawConfig) {
      throw new Error('❌ Failed to create DrawConfig');
    }

    console.log('   ✅ DrawConfig:', drawConfig.objectId);
    console.log('');

    // Print summary
    console.log('🎉 DEPLOYMENT COMPLETE!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 UPDATE YOUR .env FILES WITH THESE IDs:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('VITE_PACKAGE_ID=' + PACKAGE_ID);
    console.log('VITE_ADMIN_CAP_ID=' + ADMIN_CAP_ID);
    console.log('VITE_POOL_OBJECT_ID=' + poolObj.objectId);
    console.log('VITE_DRAW_CONFIG_ID=' + drawConfig.objectId);
    console.log('VITE_JACKPOT_TIERS_ID=' + jackpotTiers.objectId);
    console.log('VITE_NAVI_TRACKER_ID=' + NAVI_TRACKER_ID);
    console.log('VITE_SUILEND_TRACKER_ID=' + NAVI_TRACKER_ID);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }
}

deployFreshPool().catch(console.error);
