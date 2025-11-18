import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { NaviService } from './NaviService';

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const POOL_ID = '0xe38e99187fb0c0c6862bb00676c6d029bea7c2418c1e267736f9bc106bd930bf';
const ADMIN_CAP_ID = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
const TRACKER_ID = '0x3a9af68c96edd9585c92d7fd268362f29fb36539a3e8d9d932dd1b5d02b3d35c';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';

export class WithdrawalFulfiller {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private naviService: NaviService;
  private checkInterval: NodeJS.Timeout | null = null;
  private processedRequests: Set<string> = new Set();

  constructor(client: SuiClient, keypair: Ed25519Keypair, naviService: NaviService) {
    this.client = client;
    this.keypair = keypair;
    this.naviService = naviService;
  }

  async start() {
    console.log('✅ Withdrawal Fulfiller started');
    console.log('   Checking for withdrawal requests every 30s');
    
    await this.checkForWithdrawals();
    
    this.checkInterval = setInterval(async () => {
      await this.checkForWithdrawals();
    }, 30000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkForWithdrawals() {
    try {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::lottery_personal::WithdrawalRequestedEvent`
        },
        limit: 50,
        order: "descending"
      });

      if (!events.data || events.data.length === 0) {
        return;
      }

      for (const event of events.data) {
        const parsedJson = event.parsedJson as any;
        const requestId = parsedJson.request_id;
        const timestamp = parsedJson.timestamp;
        
        if (timestamp < oneHourAgo) {
          continue;
        }
        
        if (this.processedRequests.has(requestId)) {
          continue;
        }

        try {
          const requestObj = await this.client.getObject({
            id: requestId,
            options: { showContent: true }
          });

          if (requestObj.data?.content?.dataType === "moveObject") {
            const fields = requestObj.data.content.fields as any;
            
            if (!fields.fulfilled) {
              const amount = parseInt(fields.amount);
              console.log(`💸 Found pending withdrawal: $${(amount / 1_000_000).toFixed(2)}`);
              
              const success = await this.fulfillWithdrawal(requestId, amount);
              if (success) {
                this.processedRequests.add(requestId);
              }
            } else {
              this.processedRequests.add(requestId);
            }
          }
        } catch (error: any) {
          if (error.message?.includes("deleted") || error.message?.includes("does not exist")) {
            this.processedRequests.add(requestId);
          }
        }
      }
    } catch (error: any) {
      if (!error.message?.includes("deleted")) {
        console.error("❌ Error checking withdrawals:", error.message);
      }
    }
  }

  async fulfillWithdrawal(requestId: string, amount: number) {
    console.log(`   💰 Fulfilling withdrawal: $${(amount / 1_000_000).toFixed(2)}`);
    
    try {
      const tx = new Transaction();
      
      const usdcCoin = await this.naviService.withdraw(tx, amount);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::admin_record_suilend_withdrawal`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(TRACKER_ID),
          tx.pure.u64(amount),
          tx.pure.u64(0),
          tx.object(CLOCK_ID)
        ]
      });

      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::admin_fulfill_withdrawal`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(POOL_ID),
          tx.object(requestId),
          usdcCoin,
          tx.object(CLOCK_ID)
        ]
      });

      const result = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: { showEffects: true }
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`   ✅ Fulfilled! Digest: ${result.digest}`);
        return true;
      } else {
        console.log(`   ❌ Failed:`, result.effects?.status);
        return false;
      }
    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
      return false;
    }
  }
}
