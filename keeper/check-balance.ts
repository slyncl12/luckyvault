import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  const keypair = Ed25519Keypair.fromSecretKey(
    Uint8Array.from(Buffer.from(process.env.VITE_ADMIN_SECRET_KEY!, 'base64'))
  );
  
  const poolObj = await client.getObject({
    id: process.env.VITE_POOL_OBJECT_ID!,
    options: { showContent: true }
  });
  
  const fields = (poolObj.data?.content as any)?.fields;
  const userBalances = fields?.user_balances;
  
  console.log('Your address:', keypair.toSuiAddress());
  console.log('User balances in pool:', userBalances);
  
  process.exit(0);
})();
