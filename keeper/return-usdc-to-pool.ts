import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

async function returnUSDC() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));

  const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
  const ADMIN_CAP = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
  const POOL_ID = '0x95242a92e61cc45033d343029f8899a5492545133c48d7b895539edc8075935f';
  const USDC_COIN_ID = '0x4aca9a8b939c0475f1f928b0746f302149b905a4de3ff30190dae28a88d70221';
  const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

  console.log('💰 Returning $1.00 USDC to pool...');
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::admin_deposit_from_suilend`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(ADMIN_CAP),
      tx.object(POOL_ID),
      tx.object(USDC_COIN_ID)
    ]
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true }
  });

  console.log('✅ USDC returned to pool!');
  console.log('📝 TX:', result.digest);
}

returnUSDC().catch(console.error);
