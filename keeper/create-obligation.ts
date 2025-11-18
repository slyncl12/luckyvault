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
  
  const SUILEND_PACKAGE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf';
  const MAIN_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1';
  const POOL_TYPE = `${SUILEND_PACKAGE}::suilend::MAIN_POOL`;
  
  console.log('🏦 Creating Suilend Obligation for admin wallet...\n');
  
  // Check if obligation already exists
  const obligations = await client.getOwnedObjects({
    owner: keypair.toSuiAddress(),
    filter: {
      StructType: `${SUILEND_PACKAGE}::obligation::Obligation<${POOL_TYPE}>`
    }
  });
  
  if (obligations.data.length > 0) {
    console.log('✅ Obligation already exists:', obligations.data[0].data?.objectId);
    process.exit(0);
  }
  
  // Create new obligation
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${SUILEND_PACKAGE}::lending_market::create_obligation`,
    typeArguments: [POOL_TYPE],
    arguments: [
      tx.object(MAIN_MARKET),
    ],
  });
  
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });
  
  console.log('✅ Obligation created!');
  console.log('   Digest:', result.digest);
  console.log('\n💡 Now we can deposit to Suilend');
  
  process.exit(0);
})();
