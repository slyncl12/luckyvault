import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { NaviService } from './NaviService';

const PACKAGE_ID = '0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae';
const POOL_ID = '0xe38e99187fb0c0c6862bb00676c6d029bea7c2418c1e267736f9bc106bd930bf';
const ADMIN_CAP_ID = '0x535894f909c01c59f1cd3f460bcb52c5ac8e55a0a4f058e6c5553b3c50079243';
const SUILEND_TRACKER_ID = '0x3a9af68c96edd9585c92d7fd268362f29fb36539a3e8d9d932dd1b5d02b3d35c';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const CLOCK_ID = '0x6';

const MAX_POOL_BALANCE = 10000; // 0.01 USDC

export class PoolRebalancer {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private naviService: NaviService;

  constructor(client: SuiClient, keypair: Ed25519Keypair, naviService: NaviService) {
    this.client = client;
    this.keypair = keypair;
    this.naviService = naviService;
  }

  async start() {
    console.log('🚀 Starting Pool Rebalancer...');
    console.log(`   Max Balance: $${(MAX_POOL_BALANCE / 1_000_000).toFixed(2)}`);
    console.log(`   Check Interval: 30s`);

    await this.checkAndRebalance();
    setInterval(async () => {
      await this.checkAndRebalance();
    }, 30000);

    console.log('✅ Pool Rebalancer started (using NAVI Protocol)');
  }

  private async checkAndRebalance() {
    try {
      console.log('⏰ Running rebalance check...');

      const poolObject = await this.client.getObject({
        id: POOL_ID,
        options: { showContent: true }
      });

      if (poolObject.data?.content?.dataType !== 'moveObject') {
        console.log('❌ Could not fetch pool data');
        return;
      }

      const fields = poolObject.data.content.fields as any;
      const poolBalance = parseInt(fields.balance || '0');

      const trackerObject = await this.client.getObject({
        id: SUILEND_TRACKER_ID,
        options: { showContent: true }
      });

      let naviBalance = 0;
      let yieldEarned = 0;

      if (trackerObject.data?.content?.dataType === 'moveObject') {
        const trackerFields = trackerObject.data.content.fields as any;
        naviBalance = parseInt(trackerFields.deposited_to_suilend || '0');
        yieldEarned = parseInt(trackerFields.total_yield_earned || '0');
      }

      console.log('📊 Pool Status:');
      console.log(`   Total Balance: $${((poolBalance + naviBalance) / 1_000_000).toFixed(2)}`);
      console.log(`   In Pool: $${(poolBalance / 1_000_000).toFixed(2)}`);
      console.log(`   In NAVI: $${(naviBalance / 1_000_000).toFixed(2)}`);
      console.log(`   Yield Earned: $${(yieldEarned / 1_000_000).toFixed(2)}`);

      if (poolBalance > MAX_POOL_BALANCE) {
        const amountToDeposit = poolBalance;
        console.log('🔄 Rebalancing needed!');
        console.log(`   Action: DEPOSIT`);
        console.log(`   Amount: $${(amountToDeposit / 1_000_000).toFixed(2)}`);
        await this.depositExcessToNavi(amountToDeposit);
      } else {
        console.log('✅ Pool balanced');
      }
    } catch (error: any) {
      console.error('❌ Error during rebalance check:', error.message);
    }
  }

  private async depositExcessToNavi(amount: number) {
    console.log(`💰 Depositing $${(amount / 1_000_000).toFixed(2)} to NAVI...`);

    try {
      const tx = new Transaction();

      // Withdraw from pool
      const [withdrawn] = tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::admin_withdraw_for_suilend`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(POOL_ID),
          tx.pure.u64(amount),
          tx.object(CLOCK_ID)
        ]
      });

      // Get the coin ID by executing first part
      const partialResult = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: { showEffects: true, showObjectChanges: true }
      });

      if (partialResult.effects?.status?.status !== 'success') {
        console.log('   ❌ Withdrawal failed');
        return;
      }

      // Find the withdrawn USDC coin
      const createdCoins = partialResult.objectChanges?.filter(
        (change: any) => change.type === 'created' && change.objectType?.includes('Coin')
      );

      if (!createdCoins || createdCoins.length === 0) {
        console.log('   ❌ Could not find withdrawn coin');
        return;
      }

      const coinId = (createdCoins[0] as any).objectId;

      // Now deposit to NAVI
      await this.naviService.depositToNavi(this.keypair, coinId, amount);

      // Record the deposit
      const recordTx = new Transaction();
      recordTx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::admin_record_suilend_deposit`,
        typeArguments: [USDC_TYPE],
        arguments: [
          recordTx.object(ADMIN_CAP_ID),
          recordTx.object(SUILEND_TRACKER_ID),
          recordTx.pure.u64(amount),
          recordTx.object(CLOCK_ID)
        ]
      });

      const recordResult = await this.client.signAndExecuteTransaction({
        transaction: recordTx,
        signer: this.keypair,
        options: { showEffects: true }
      });

      if (recordResult.effects?.status?.status === 'success') {
        console.log(`   ✅ Deposited to NAVI and recorded!`);
      }
    } catch (error: any) {
      console.error('❌ Error depositing to NAVI:', error.message);
    }
  }
}

export function createPoolRebalancer(client: SuiClient, keypair: Ed25519Keypair, naviService: NaviService): PoolRebalancer {
  return new PoolRebalancer(client, keypair, naviService);
}
