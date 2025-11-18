import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

async function createMegaPool() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));

  const PACKAGE_ID = process.env.VITE_PACKAGE_ID!;
  const ADMIN_CAP_ID = process.env.VITE_ADMIN_CAP_ID!;
  const USDC_TYPE = process.env.VITE_USDC_TYPE!;

  console.log('Creating MegaPool...');
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::initialize_mega_pool`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(ADMIN_CAP_ID),
    ],
  });
  tx.setGasBudget(100000000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  console.log('Full result:', JSON.stringify(result, null, 2));
  
  const created = result.objectChanges?.filter((obj: any) => obj.type === 'created');
  console.log('\nAll created objects:', created);
}

createMegaPool().catch(console.error);
