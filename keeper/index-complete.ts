import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

const THRESHOLD = 2000; // $0.002 in micro-USDC

async function main() {
  console.log('🚀 LuckyVault Complete Keeper Starting...\n');
  
  const secretKeyBase64 = process.env.VITE_ADMIN_SECRET_KEY!;
  const fullKey = Buffer.from(secretKeyBase64, 'base64');
  const secretKeyBytes = fullKey.length === 33 ? fullKey.slice(1) : fullKey;
  const adminKeypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(secretKeyBytes));
  
  const suiClient = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const PACKAGE_ID = process.env.VITE_NEW_PACKAGE_ID!;
  const ADMIN_CAP = process.env.VITE_NEW_ADMIN_CAP_ID!;
  const POOL_ID = process.env.VITE_NEW_POOL_OBJECT_ID!;
  const TRACKER_ID = process.env.VITE_NEW_SUILEND_TRACKER_ID!;
  const USDC_TYPE = process.env.VITE_USDC_TYPE!;
  
  console.log('👤 Admin:', adminKeypair.toSuiAddress());
  console.log('🏊 Pool:', POOL_ID);
  console.log('💎 Threshold: $' + (THRESHOLD / 1_000_000).toFixed(6));
  
  setInterval(async () => {
    try {
      const pool = await suiClient.getObject({
        id: POOL_ID,
        options: { showContent: true }
      });
      
      const fields = (pool.data?.content as any)?.fields;
      const balance = parseInt(fields?.balance || '0');
      
      if (balance > THRESHOLD) {
        console.log(`\n💰 Pool balance: $${(balance / 1_000_000).toFixed(6)} > threshold`);
        console.log('📤 Depositing to Suilend...');
        
        const tx = new Transaction();
        
        tx.moveCall({
          target: `${PACKAGE_ID}::lottery_personal::check_and_deposit_to_suilend`,
          typeArguments: [USDC_TYPE],
          arguments: [
            tx.object(ADMIN_CAP),  // AdminCap (was missing!)
            tx.object(POOL_ID),
            tx.object(TRACKER_ID),
            tx.object('0x6'), // Clock
          ],
        });
        
        const result = await suiClient.signAndExecuteTransaction({
          transaction: tx,
          signer: adminKeypair,
        });
        
        console.log('✅ Deposited to Suilend!');
        console.log('   Digest:', result.digest);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }, 10000);
  
  console.log('\n✅ Keeper running!');
  console.log('   Checking pool balance every 10s...\n');
}

main().catch(console.error);
