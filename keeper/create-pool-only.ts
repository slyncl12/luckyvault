import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const ADMIN_CAP_ID = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';

async function createPool() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });

  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  const adminAddress = keypair.toSuiAddress();

  console.log('Creating Pool...');
  console.log('Admin:', adminAddress);

  // Use admin address and a dummy address (0x1) for the two whitelist slots
  const dummyAddress = '0x0000000000000000000000000000000000000000000000000000000000000001';

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::create_pool`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(ADMIN_CAP_ID),
      tx.pure.address(adminAddress),
      tx.pure.address(dummyAddress),  // Different address!
      tx.object(CLOCK_ID)
    ]
  });
  tx.setGasBudget(100000000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
    }
  });

  console.log('\n✅ Transaction:', result.digest);
  console.log('Status:', result.effects?.status);
  
  const created = result.objectChanges?.filter((obj: any) => obj.type === 'created') || [];
  const pool = created.find((obj: any) => obj.objectType?.includes('LotteryPool'));
  
  if (pool) {
    console.log('\n✅ Pool Created:', pool.objectId);
  } else {
    console.log('\nObject Changes:', JSON.stringify(result.objectChanges, null, 2));
  }
}

createPool().catch(console.error);
