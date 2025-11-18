import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config();

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
  
  // Main loop
  setInterval(async () => {
    try {
      // 1. Check for withdrawal requests
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::lottery_personal::WithdrawalRequestedEvent`
        },
        order: 'descending',
        limit: 10
      });
      
      for (const event of events.data) {
        const eventData = event.parsedJson as any;
        const requestId = eventData.request_id;
        
        // Check if request still exists (not fulfilled)
        try {
          const request = await suiClient.getObject({
            id: requestId,
            options: { showContent: true }
          });
          
          if (request.data) {
            const fields = (request.data.content as any)?.fields;
            const amount = parseInt(fields.amount);
            
            console.log(`\n💸 Withdrawal request found!`);
            console.log(`   User: ${fields.user}`);
            console.log(`   Amount: $${(amount / 1_000_000).toFixed(2)}`);
            
            // Get USDC from admin wallet
            const adminCoins = await suiClient.getCoins({
              owner: adminKeypair.toSuiAddress(),
              coinType: USDC_TYPE
            });
            
            if (adminCoins.data.length === 0) {
              console.log('   ❌ Admin has no USDC - need to withdraw from Suilend first');
              // TODO: Implement Suilend withdrawal
              continue;
            }
            
            const tx = new Transaction();
            const [coin] = tx.splitCoins(tx.object(adminCoins.data[0].coinObjectId), [amount]);
            
            tx.moveCall({
              target: `${PACKAGE_ID}::lottery_personal::admin_fulfill_withdrawal`,
              typeArguments: [USDC_TYPE],
              arguments: [
                tx.object(ADMIN_CAP),
                tx.object(POOL_ID),
                tx.object(requestId),
                coin,
                tx.object('0x6'),
              ],
            });
            
            const result = await suiClient.signAndExecuteTransaction({
              transaction: tx,
              signer: adminKeypair,
            });
            
            console.log('   ✅ Withdrawal fulfilled!');
            console.log('   Digest:', result.digest);
          }
        } catch (e) {
          // Request already fulfilled or doesn't exist
        }
      }
      
      // 2. Check pool balance and deposit to Suilend if needed
      const pool = await suiClient.getObject({
        id: POOL_ID,
        options: { showContent: true }
      });
      
      const fields = (pool.data?.content as any)?.fields;
      const balance = parseInt(fields?.balance || '0');
      
      if (balance > 2000) {
        console.log(`\n💰 Pool balance: $${(balance / 1_000_000).toFixed(6)}`);
        console.log('📤 Depositing to Suilend...');
        
        const tx = new Transaction();
        
        tx.moveCall({
          target: `${PACKAGE_ID}::lottery_personal::check_and_deposit_to_suilend`,
          typeArguments: [USDC_TYPE],
          arguments: [
            tx.object(ADMIN_CAP),
            tx.object(POOL_ID),
            tx.object(TRACKER_ID),
            tx.object('0x6'),
          ],
        });
        
        const result = await suiClient.signAndExecuteTransaction({
          transaction: tx,
          signer: adminKeypair,
        });
        
        console.log('✅ Deposited to Suilend!');
        console.log('   Digest:', result.digest);
      }
    } catch (error: any) {
      if (!error.message?.includes('No function was found')) {
        console.error('❌ Error:', error.message);
      }
    }
  }, 10000);
  
  console.log('\n✅ Keeper running!');
  console.log('   - Fulfilling withdrawals');
  console.log('   - Depositing to Suilend\n');
}

main().catch(console.error);
