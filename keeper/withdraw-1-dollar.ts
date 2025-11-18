import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const POOL_ID = '0x384deab8a7d8fd9d2a3b3d396d4e5cb2be0753e38189092c1941ab22f2449357';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';

async function withdraw() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));

  console.log('Withdrawing $1.00 as whitelisted user...');
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::withdraw`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(POOL_ID),
      tx.pure.u64(1000000), // $1.00
      tx.object(CLOCK_ID)
    ]
  });
  tx.setGasBudget(100000000);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true }
  });

  console.log('✅ Withdrawn! TX:', result.digest);
}

withdraw().catch(console.error);
