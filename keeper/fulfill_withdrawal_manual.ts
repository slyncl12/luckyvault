import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
const { secretKey } = decodeSuiPrivateKey(process.env.VITE_ADMIN_SECRET_KEY!);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const POOL_ID = '0xe38e99187fb0c0c6862bb00676c6d029bea7c2418c1e267736f9bc106bd930bf';
const ADMIN_CAP_ID = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';
const WITHDRAWAL_REQUEST_ID = '0x5eef2522ae2d61101a145211bb9d9db507f1d372fe53453c7ba43b8b6ef28254';

async function fulfillWithdrawal() {
  console.log('💸 Fulfilling withdrawal request:', WITHDRAWAL_REQUEST_ID);
  
  const coins = await client.getCoins({
    owner: keypair.toSuiAddress(),
    coinType: USDC_TYPE
  });

  if (coins.data.length === 0) {
    console.log('❌ No USDC in admin wallet');
    return;
  }

  console.log(`💰 Found USDC coin: ${coins.data[0].coinObjectId}`);

  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(
    tx.object(coins.data[0].coinObjectId),
    [2000000] // $2
  );

  tx.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::admin_fulfill_withdrawal`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(ADMIN_CAP_ID),
      tx.object(POOL_ID),
      tx.object(WITHDRAWAL_REQUEST_ID),
      paymentCoin,
      tx.object(CLOCK_ID)
    ]
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showEvents: true }
  });

  console.log('✅ Result:', result.digest);
  console.log('Status:', result.effects?.status?.status);
}

fulfillWithdrawal();
