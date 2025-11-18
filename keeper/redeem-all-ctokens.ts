import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('💰 Redeeming ALL CTokens for USDC...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const cTokenIds = [
    '0x017a4dfa491e6da10efe966f6a975d382e4cf714395d60804d08ffa51e3ff408', // 923420
    '0x3c9c1a0240875c1b55db0716785373819cba590088499bbf9b1e203ae96c5a67', // 923415
    '0x6fc2b64bcf3d2e5668861c979ed9715706d06f5dd04da67b70f4e320ac56449c', // 914188
    '0x726252b5337cf7d33ff437344af5fd67d524da6b97113186c283202a2e4837cb', // 914235
    '0x76ce7926b0e9b3302dcd043f414e108a196fdc3b8054b9e351e6614c8145ac08', // 92561
    '0x9404121bea357a35d333533ae952d76f195f616965aca83dc0607860285c87ba', // 8310
  ];
  
  console.log('📊 Redeeming', cTokenIds.length, 'CToken coins');
  console.log('   Total CTokens: ~3,776,129');
  console.log('   Expected USDC: ~$3.00\n');
  
  const tx = new Transaction();
  
  // Suilend's redeem function
  const SUILEND_PACKAGE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf';
  const LENDING_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ead1';
  const USDC_RESERVE = '0xeb3903f7748ace73429bd52a70fff278aac1725d3b72c25e17b8214fe9cee78f';
  
  // Merge all CTokens first
  const [firstCoin, ...restCoins] = cTokenIds;
  
  if (restCoins.length > 0) {
    tx.mergeCoins(
      tx.object(firstCoin),
      restCoins.map(id => tx.object(id))
    );
  }
  
  // Redeem CTokens for USDC
  tx.moveCall({
    target: `${SUILEND_PACKAGE}::lending_market::redeem_ctokens_and_withdraw_liquidity`,
    typeArguments: [
      `${SUILEND_PACKAGE}::suilend::MAIN_POOL`,
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    ],
    arguments: [
      tx.object(LENDING_MARKET),
      tx.object(USDC_RESERVE),
      tx.object(firstCoin), // Merged CTokens
      tx.object('0x6'),
    ],
  });
  
  console.log('🔄 Executing redemption transaction...');
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
  
  console.log('\n✅ CTokens redeemed!');
  console.log('   Digest:', result.digest);
  console.log('   Status:', result.effects?.status?.status);
  
  if (result.effects?.status?.status === 'success') {
    console.log('\n🎉 SUCCESS! You now have USDC back in your wallet!');
    console.log('   Next: Put this USDC back in the old pool so users can withdraw');
  }
  
  process.exit(0);
})();
