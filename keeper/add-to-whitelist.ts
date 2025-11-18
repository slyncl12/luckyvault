import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('➕ Adding NEW admin wallet to whitelist...\n');
  
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Load NEW admin keypair
  const secretKeyBase64 = process.env.VITE_NEW_ADMIN_SECRET_KEY || process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const PACKAGE_ID = '0x8710a72d6066dcb031a72369d545b430fdb47d26e1987ba87628c778c9adfe07';
  const ADMIN_CAP = '0x21022eca718113aa3207482cdeede66170222c68df407b2e3b6d7989922121ab';
  const POOL_ID = '0x3ce09dc74fdb8f703a8988a9e47495bb337d6d463ec87c820c31da2bdc76d08e';
  const NEW_WALLET = '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382';
  const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
  const CLOCK_ID = '0x6';
  
  console.log('👤 Admin:', keypair.toSuiAddress());
  console.log('➕ Adding:', NEW_WALLET);
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::lottery_personal::add_to_whitelist`,
    typeArguments: [USDC_TYPE],
    arguments: [
      tx.object(ADMIN_CAP),
      tx.object(POOL_ID),
      tx.pure.address(NEW_WALLET),
      tx.object(CLOCK_ID),
    ],
  });
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
  
  console.log('\n✅ Added to whitelist!');
  console.log('   Digest:', result.digest);
  
  process.exit(0);
})();
