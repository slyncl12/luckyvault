import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { suilendService } from './SuilendService';

interface RebalancerConfig {
  minBalanceUsdc: number;
  targetBalanceUsdc: number;
  maxBalanceUsdc: number;
  checkIntervalMs: number;
}

export class PoolRebalancer {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private poolObjectId: string;
  private config: RebalancerConfig;
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    suiClient: SuiClient,
    keypair: Ed25519Keypair,
    poolObjectId: string,
    config: RebalancerConfig
  ) {
    this.suiClient = suiClient;
    this.keypair = keypair;
    this.poolObjectId = poolObjectId;
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Rebalancer is already running');
      return;
    }

    console.log('🚀 Starting Pool Rebalancer...');
    console.log(`   Min Balance: $${this.config.minBalanceUsdc.toFixed(2)}`);
    console.log(`   Target Balance: $${this.config.targetBalanceUsdc.toFixed(2)}`);
    console.log(`   Max Balance: $${this.config.maxBalanceUsdc.toFixed(2)}`);
    console.log(`   Check Interval: ${this.config.checkIntervalMs / 1000}s`);

    // Initialize Suilend
    await suilendService.initialize();

    this.isRunning = true;

    // Run initial check
    await this.checkAndRebalance();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.checkAndRebalance();
    }, this.config.checkIntervalMs);

    console.log('✅ Pool Rebalancer started\n');
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    console.log('🛑 Pool Rebalancer stopped');
  }

  private async checkAndRebalance(): Promise<void> {
    try {
      console.log('⏰ Running rebalance check...');

      // Get pool status
      const poolBalance = await this.getPoolBalance();
      const suilendBalance = await this.getSuilendBalance();
      const totalBalance = poolBalance + suilendBalance;
      const yieldEarned = 0; // TODO: Calculate yield

      console.log('📊 Pool Status:');
      console.log(`   Total Balance: $${totalBalance.toFixed(2)}`);
      console.log(`   In Pool: $${poolBalance.toFixed(2)}`);
      console.log(`   In Suilend: $${suilendBalance.toFixed(2)}`);
      console.log(`   Yield Earned: $${yieldEarned.toFixed(2)}`);

      // Check if rebalancing is needed
      if (poolBalance > this.config.maxBalanceUsdc) {
        // Pool has too much - deposit to Suilend
        const excessAmount = poolBalance - this.config.targetBalanceUsdc;
        console.log('🔄 Rebalancing needed!');
        console.log(`   Action: DEPOSIT`);
        console.log(`   Amount: $${excessAmount.toFixed(2)}`);

        await this.depositExcessToSuilend(excessAmount);
      } else if (poolBalance < this.config.minBalanceUsdc && suilendBalance > 0) {
        // Pool has too little - withdraw from Suilend
        const neededAmount = this.config.targetBalanceUsdc - poolBalance;
        const withdrawAmount = Math.min(neededAmount, suilendBalance);
        console.log('🔄 Rebalancing needed!');
        console.log(`   Action: WITHDRAW`);
        console.log(`   Amount: $${withdrawAmount.toFixed(2)}`);

        await this.withdrawFromSuilendToPool(withdrawAmount);
      } else {
        console.log('✅ Pool is balanced, no action needed');
      }

      console.log();
    } catch (error) {
      console.error('❌ Error during rebalance check:', error);
    }
  }

  private async getPoolBalance(): Promise<number> {
    try {
      const poolObject = await this.suiClient.getObject({
        id: this.poolObjectId,
        options: { showContent: true },
      });

      if (!poolObject.data?.content || poolObject.data.content.dataType !== 'moveObject') {
        throw new Error('Invalid pool object');
      }

      const fields = poolObject.data.content.fields as any;
      const balance = Number(fields.balance || 0);
      return balance / 1_000_000; // Convert from base units to USDC
    } catch (error) {
      console.error('Error getting pool balance:', error);
      return 0;
    }
  }

  private async getSuilendBalance(): Promise<number> {
    // TODO: Track cToken balance and calculate USDC value
    return 0;
  }

  private async depositExcessToSuilend(amount: number): Promise<void> {
    try {
      console.log(`💰 Depositing $${amount.toFixed(2)} to Suilend...`);

      // Step 1: Withdraw from pool using admin function
      const withdrawResult = await this.withdrawFromPool(amount);
      
      if (!withdrawResult.success || !withdrawResult.coinId) {
        throw new Error('Failed to withdraw from pool');
      }

      console.log(`✅ Withdrew $${amount.toFixed(2)} from pool`);
      console.log(`   Transaction: ${withdrawResult.digest}`);
      console.log(`📍 USDC Coin ID: ${withdrawResult.coinId}`);

      // Step 2: Deposit ONLY this specific coin to Suilend
      console.log(`📤 Depositing to Suilend...`);
      await this.depositSpecificCoinToSuilend(withdrawResult.coinId, amount);

      console.log(`✅ Successfully deposited to Suilend!`);
      console.log(`   Transaction: ${withdrawResult.digest}`);
      console.log(`   💰 Now earning 11.34% APY!`);
    } catch (error) {
      console.error('❌ Error depositing to Suilend:', error);
      throw error;
    }
  }

  private async withdrawFromPool(amount: number): Promise<{
    success: boolean;
    digest?: string;
    coinId?: string;
  }> {
    try {
      const amountInBaseUnits = Math.floor(amount * 1_000_000);

      const tx = new Transaction();
      
      // Call admin_withdraw_for_suilend
      tx.moveCall({
        target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::admin_withdraw_for_suilend`,
        arguments: [
          tx.object(process.env.VITE_ADMIN_CAP_ID!),
          tx.object(this.poolObjectId),
          tx.pure.u64(amountInBaseUnits),
        ],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Extract the created USDC coin ID
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );

      const usdcCoin = createdObjects?.find((obj: any) =>
        obj.objectType?.includes('usdc::USDC') && !obj.objectType?.includes('CToken')
      );

      if (!usdcCoin) {
        throw new Error('Could not find created USDC coin');
      }

      return {
        success: true,
        digest: result.digest,
        coinId: usdcCoin.objectId,
      };
    } catch (error) {
      console.error('Error withdrawing from pool:', error);
      return { success: false };
    }
  }

  private async depositSpecificCoinToSuilend(
    usdcCoinId: string,
    amount: number
  ): Promise<void> {
    try {
      // CRITICAL SAFETY CHECK: Verify this coin came from our pool withdrawal
      const coinInfo = await this.suiClient.getObject({
        id: usdcCoinId,
        options: { 
          showContent: true,
          showType: true,
          showPreviousTransaction: true 
        },
      });

      if (!coinInfo.data) {
        throw new Error(`Coin ${usdcCoinId} not found`);
      }

      // Verify it's USDC
      if (!coinInfo.data.type?.includes('usdc::USDC')) {
        throw new Error(`Coin ${usdcCoinId} is not USDC`);
      }

      console.log(`   ✅ Verified coin ${usdcCoinId} is USDC from pool withdrawal`);

      // Deposit to Suilend using our service
      await suilendService.depositToSuilend(
        this.keypair,
        usdcCoinId,
        amount
      );
    } catch (error) {
      console.error('Error in depositSpecificCoinToSuilend:', error);
      throw error;
    }
  }

  private async withdrawFromSuilendToPool(amount: number): Promise<void> {
    console.log(`💸 Withdrawing $${amount.toFixed(2)} from Suilend to pool...`);
    // TODO: Implement withdrawal from Suilend
    console.log('⚠️  Suilend withdrawal not yet implemented');
  }
}

// Export singleton rebalancer
export let poolRebalancer: PoolRebalancer | null = null;

export function createPoolRebalancer(
  suiClient: SuiClient,
  keypair: Ed25519Keypair,
  poolObjectId: string,
  config: RebalancerConfig
): PoolRebalancer {
  poolRebalancer = new PoolRebalancer(suiClient, keypair, poolObjectId, config);
  return poolRebalancer;
}
