import { SuilendDepositor } from './SuilendDepositor';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const adminKeypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const depositor = new SuilendDepositor(
    client,
    adminKeypair,
    process.env.VITE_NEW_PACKAGE_ID!,
    process.env.VITE_NEW_ADMIN_CAP_ID!,
    process.env.VITE_NEW_POOL_OBJECT_ID!,
    process.env.VITE_NEW_SUILEND_TRACKER_ID!,
    process.env.VITE_USDC_TYPE!
  );
  
  console.log('💰 Manually depositing $0.50 to Suilend...\n');
  
  // Skip step 1 (already withdrawn), just do steps 2-3
  const SUILEND_PACKAGE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf';
  const MAIN_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1';
  const USDC_TYPE = process.env.VITE_USDC_TYPE!;
  const amount = 500_000; // $0.50
  
  const { Transaction } = await import('@mysten/sui/transactions');
  
  // Step 2: Deposit to Suilend
  const coins = await client.getCoins({
    owner: adminKeypair.toSuiAddress(),
    coinType: USDC_TYPE
  });
  
  const tx2 = new Transaction();
  const [coin] = tx2.splitCoins(tx2.object(coins.data[0].coinObjectId), [amount]);
  
  tx2.moveCall({
    target: `${SUILEND_PACKAGE}::lending_market::deposit_liquidity_and_mint_ctokens`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx2.object(MAIN_MARKET),
      tx2.pure.u64(0), // USDC reserve index
      tx2.object('0x6'),
      coin,
    ],
  });
  
  console.log('📤 Depositing to Suilend...');
  const result = await client.signAndExecuteTransaction({
    transaction: tx2,
    signer: adminKeypair,
  });
  
  console.log('✅ Deposited!');
  console.log('   Digest:', result.digest);
  
  // Step 3: Record in tracker
  const tx3 = new Transaction();
  tx3.moveCall({
    target: `${process.env.VITE_NEW_PACKAGE_ID}::lottery_personal::admin_record_suilend_deposit`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx3.object(process.env.VITE_NEW_ADMIN_CAP_ID!),
      tx3.object(process.env.VITE_NEW_SUILEND_TRACKER_ID!),
      tx3.pure.u64(amount),
      tx3.object('0x6'),
    ],
  });
  
  console.log('📝 Recording in tracker...');
  await client.signAndExecuteTransaction({
    transaction: tx3,
    signer: adminKeypair,
  });
  
  console.log('✅ Complete! Check your wallet on Suilend app');
  
  process.exit(0);
})();
