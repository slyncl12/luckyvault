import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuilendDepositor } from './SuilendDepositor';
import { SuilendWithdrawer } from './SuilendWithdrawer';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 LuckyVault Final Keeper Starting...\n');
  
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
  
  const suilendDepositor = new SuilendDepositor(
    suiClient, adminKeypair, PACKAGE_ID, ADMIN_CAP, POOL_ID, TRACKER_ID, USDC_TYPE
  );
  
  const suilendWithdrawer = new SuilendWithdrawer(
    suiClient, adminKeypair, PACKAGE_ID, ADMIN_CAP, POOL_ID, TRACKER_ID, USDC_TYPE
  );
  
  console.log('👤 Admin:', adminKeypair.toSuiAddress());
  console.log('🏊 Pool:', POOL_ID);
  
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
        
        try {
          const request = await suiClient.getObject({
            id: requestId,
            options: { showContent: true }
          });
          
          if (request.data) {
            const fields = (request.data.content as any)?.fields;
            const amount = parseInt(fields.amount);
            
            console.log(`\n💸 Withdrawal request: $${(amount / 1_000_000).toFixed(2)} for ${fields.user}`);
            
            // Check admin USDC balance
            const adminCoins = await suiClient.getCoins({
              owner: adminKeypair.toSuiAddress(),
              coinType: USDC_TYPE
            });
            
            const adminBalance = adminCoins.data.reduce((sum, c) => sum + parseInt(c.balance), 0);
            
            // If not enough, withdraw from Suilend
            if (adminBalance < amount) {
              console.log(`   ⚠️  Need $${(amount / 1_000_000).toFixed(2)}, have $${(adminBalance / 1_000_000).toFixed(2)}`);
              console.log(`   📥 Withdrawing from Suilend...`);
              await suilendWithdrawer.withdrawFromSuilend(amount);
            }
            
            // Fulfill withdrawal
            const freshCoins = await suiClient.getCoins({
              owner: adminKeypair.toSuiAddress(),
              coinType: USDC_TYPE
            });
            
            const tx = new Transaction();
            const [coin] = tx.splitCoins(tx.object(freshCoins.data[0].coinObjectId), [amount]);
            
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
          // Already fulfilled
        }
      }
      
      // 2. Deposit excess to Suilend
      const pool = await suiClient.getObject({
        id: POOL_ID,
        options: { showContent: true }
      });
      
      const fields = (pool.data?.content as any)?.fields;
      const balance = parseInt(fields?.balance || '0');
      const threshold = 10_000;
      
      if (balance > threshold) {
        const toDeposit = balance - threshold;
        console.log(`\n💰 Pool: $${(balance / 1_000_000).toFixed(6)}, depositing $${(toDeposit / 1_000_000).toFixed(6)} to Suilend`);
        
        await suilendDepositor.depositToSuilend(toDeposit);
        console.log('   ✅ Complete!');
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  }, 15000);
  
  console.log('\n✅ Keeper running!');
  console.log('   - Withdrawals: Auto-redeem from Suilend');
  console.log('   - Deposits: Auto-deposit to Suilend\n');
}

main().catch(console.error);
