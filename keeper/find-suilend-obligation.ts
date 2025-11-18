import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔍 Finding Suilend obligations for admin wallet...\n');
  
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
  
  console.log('\n🔍 Looking for Suilend obligations...');
  
  for (const obj of objects.data) {
    const type = obj.data?.type;
    if (type?.includes('obligation') || type?.includes('Obligation')) {
      console.log('\n✅ FOUND OBLIGATION:');
      console.log('   ID:', obj.data?.objectId);
      console.log('   Type:', type);
      console.log('   Content:', JSON.stringify((obj.data?.content as any)?.fields, null, 2));
    }
  }
  
  process.exit(0);
})();
