import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

async function createTracker() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));

  console.log('Creating SuilendTracker...');
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${process.env.VITE_PACKAGE_ID}::lottery_personal::initialize_suilend_tracker`,
    arguments: [
      tx.object('0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243'), // AdminCap
      tx.object('0x6'), // Clock
    ],
  });
  tx.setGasBudget(100000000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  console.log('✅ Tracker created! TX:', result.digest);
  
  const created = result.objectChanges?.filter((obj: any) => obj.type === 'created');
  const tracker = created?.find((obj: any) => obj.objectType?.includes('SuilendTracker'));
  console.log('🎯 Tracker ID:', tracker?.objectId);
  console.log('\nAdd this to your .env files:');
  console.log(`VITE_SUILEND_TRACKER_ID=${tracker?.objectId}`);
}

createTracker().catch(console.error);
