import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

async function recordDeposit() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));

  console.log('Recording existing $2.00 deposit to tracker...');
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${process.env.VITE_PACKAGE_ID}::lottery_personal::admin_record_suilend_deposit`,
    typeArguments: [process.env.VITE_USDC_TYPE!],
    arguments: [
      tx.object(process.env.VITE_ADMIN_CAP_ID!),
      tx.object(process.env.VITE_SUILEND_TRACKER_ID!),
      tx.pure.u64(2000000), // $2.00
      tx.object(process.env.VITE_CLOCK_ID!),
    ]
  });
  tx.setGasBudget(100000000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true }
  });

  console.log('✅ Tracker updated! TX:', result.digest);
}

recordDeposit().catch(console.error);
