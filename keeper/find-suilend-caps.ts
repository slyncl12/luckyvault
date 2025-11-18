import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔍 Finding Suilend ObligationOwnerCaps...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const adminAddress = keypair.toSuiAddress();
  console.log('👤 Admin:', adminAddress);
  
  // Find all objects owned by admin
  const objects = await client.getOwnedObjects({
    owner: adminAddress,
    options: {
      showType: true,
      showContent: true,
    },
  });
  
  console.log('\n📦 All objects owned by admin:');
  console.log('Total:', objects.data.length);
  
  for (const obj of objects.data) {
    const type = obj.data?.type;
    console.log('\n---');
    console.log('ID:', obj.data?.objectId);
    console.log('Type:', type);
    
    // Look for anything Suilend-related
    if (type?.includes('suilend') || type?.includes('Suilend')) {
      console.log('⭐ SUILEND OBJECT FOUND!');
      console.log('Content:', JSON.stringify((obj.data?.content as any)?.fields, null, 2));
    }
  }
  
  process.exit(0);
})();
