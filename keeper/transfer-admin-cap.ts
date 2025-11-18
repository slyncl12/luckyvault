import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔐 Transferring AdminCap to new secure wallet...\n');
  
  const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });
  
  // OLD compromised keypair
  const oldSecretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(oldSecretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const oldKeypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const OLD_ADMIN_CAP = '0xf5bdba7c51f4ef1e7512e45d72976bc157f91d1d195e582b97cd251f70344012';
  const NEW_ADDRESS = '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382';
  
  console.log('📤 From:', oldKeypair.toSuiAddress());
  console.log('📥 To:', NEW_ADDRESS);
  console.log('🔑 AdminCap:', OLD_ADMIN_CAP);
  
  const tx = new Transaction();
  
  tx.transferObjects(
    [tx.object(OLD_ADMIN_CAP)],
    NEW_ADDRESS
  );
  
  console.log('\n🔄 Executing transfer...');
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: oldKeypair,
    options: {
      showEffects: true,
    },
  });
  
  console.log('\n✅ AdminCap transferred!');
  console.log('   Digest:', result.digest);
  console.log('   Status:', result.effects?.status?.status);
  
  console.log('\n🎉 OLD KEY IS NOW POWERLESS!');
  console.log('   Even if someone has it, they cannot control the pool.');
  
  process.exit(0);
})();
