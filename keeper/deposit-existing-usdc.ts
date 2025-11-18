import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const SUILEND_PACKAGE = '0x34171e8092d831c1cb71d70b04389f9a0fec8af56f69e760b58d613d764c6945';
  const POOL_TYPE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL';
  const MAIN_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1';
  const USDC_TYPE = process.env.VITE_USDC_TYPE!;
  const amount = 500_000;
  
  console.log('💰 Depositing existing $0.50 to Suilend...\n');
  
  const coins = await client.getCoins({
    owner: keypair.toSuiAddress(),
    coinType: USDC_TYPE
  });
  
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [amount]);
  
  tx.moveCall({
    target: `${SUILEND_PACKAGE}::lending_market::deposit_liquidity_and_mint_ctokens`,
    typeArguments: [POOL_TYPE, USDC_TYPE],
    arguments: [
      tx.object(MAIN_MARKET),
      tx.pure.u64(0), // USDC reserve
      tx.object('0x6'),
      coin,
    ],
  });
  
  console.log('📤 Depositing...');
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
  
  console.log('✅ Deposited to Suilend!');
  console.log('   Digest:', result.digest);
  console.log('\n🎉 NOW CHECK SUILEND APP - you should see a position!');
  
  // Record in tracker
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${process.env.VITE_NEW_PACKAGE_ID}::lottery_personal::admin_record_suilend_deposit`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx2.object(process.env.VITE_NEW_ADMIN_CAP_ID!),
      tx2.object(process.env.VITE_NEW_SUILEND_TRACKER_ID!),
      tx2.pure.u64(amount),
      tx2.object('0x6'),
    ],
  });
  
  console.log('📝 Recording...');
  await client.signAndExecuteTransaction({
    transaction: tx2,
    signer: keypair,
  });
  
  console.log('✅ Complete!');
  
  process.exit(0);
})();
