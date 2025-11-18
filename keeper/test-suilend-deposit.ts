import { SuilendDepositor } from './SuilendDepositor';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const depositor = new SuilendDepositor(
    client, keypair,
    process.env.VITE_NEW_PACKAGE_ID!,
    process.env.VITE_NEW_ADMIN_CAP_ID!,
    process.env.VITE_NEW_POOL_OBJECT_ID!,
    process.env.VITE_NEW_SUILEND_TRACKER_ID!,
    process.env.VITE_USDC_TYPE!
  );
  
  console.log('🚀 Testing Suilend deposit with CORRECT package...\n');
  
  const digest = await depositor.depositToSuilend(500_000);
  console.log('\n✅ SUCCESS! Digest:', digest);
  console.log('🎉 Check your wallet on Suilend app!');
  
  process.exit(0);
})();
