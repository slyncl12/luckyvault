import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

async function checkNaviBalance() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY;
  const fullKey = Buffer.from(secretKeyBase64!, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const address = keypair.toSuiAddress();
  
  // Get all objects owned by admin
  const objects = await client.getOwnedObjects({
    owner: address,
    options: { showType: true, showContent: true }
  });
  
  console.log('Looking for NAVI Storage objects...');
  
  for (const obj of objects.data) {
    if (obj.data?.type?.includes('Storage') || obj.data?.type?.includes('navi')) {
      console.log('\nNAVI Object found:');
      console.log('Type:', obj.data.type);
      console.log('Content:', JSON.stringify(obj.data.content, null, 2));
    }
  }
}

checkNaviBalance().catch(console.error);
