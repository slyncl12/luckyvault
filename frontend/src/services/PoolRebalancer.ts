/**
 * Pool Rebalancer Keeper
 * Automatically manages pool liquidity by depositing to/withdrawing from Suilend
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { suilendService } from './SuilendService.js';

interface RebalancerConfig {
  poolObjectId: string;           // Your lottery pool object ID
  adminKeypair: Ed25519Keypair;   // Admin keypair for executing transactions
  minPoolBalance: number;         // Minimum USDC to keep in pool (e.g., 10)
  targetPoolBalance: number;      // Target USDC to maintain in pool (e.g., 20)
  maxPoolBalance: number;         // Max USDC before depositing to Suilend (e.g., 50)
  checkIntervalMs: number;        // How often to check (e.g., 60000 = 1 minute)
  rpcUrl: string;                 // Sui RPC URL
}

interface PoolStats {
  totalBalance: number;           // Total USDC in pool
  inPool: number;                 // USDC physically in pool contract
  inSuilend: number;              // USDC deposited to Suilend
  yieldEarned: number;            // Yield earned from Suilend
  needsRebalance: boolean;        // Whether rebalancing is needed
  action: 'deposit' | 'withdraw' | 'none';
  amount: number;                 // Amount to deposit or withdraw
}

export class PoolRebalancer {
  private config: RebalancerConfig;
  private suiClient: SuiClient;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: RebalancerConfig) {
    this.config = config;
    this.suiClient = new SuiClient({ url: config.rpcUrl });
  }

  /**
   * Start the automatic rebalancing service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Rebalancer is already running');
      return;
    }

    console.log('🚀 Starting Pool Rebalancer...');
    console.log(`   Min Balance: $${this.config.minPoolBalance}`);
    console.log(`   Target Balance: $${this.config.targetPoolBalance}`);
    console.log(`   Max Balance: $${this.config.maxPoolBalance}`);
    console.log(`   Check Interval: ${this.config.checkIntervalMs / 1000}s`);

    // Initialize Suilend service
    await suilendService.initialize();

    this.isRunning = true;

    // Run initial check
    await this.checkAndRebalance();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.checkAndRebalance();
    }, this.config.checkIntervalMs);

    console.log('✅ Pool Rebalancer started');
  }

  /**
   * Stop the rebalancing service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Rebalancer is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 Pool Rebalancer stopped');
  }

  /**
   * Get current pool statistics
   */
  async getPoolStats(): Promise<PoolStats> {
    // Get pool balance (query the pool contract)
    const poolBalance = await this.getPoolBalance();

    // Get Suilend position
    const adminAddress = this.config.adminKeypair.toSuiAddress();
    const suilendPosition = await suilendService.getUserPosition(adminAddress);

    const inSuilend = suilendPosition 
      ? Number(suilendPosition.currentValue) / 1_000_000 
      : 0;
    
    const yieldEarned = suilendPosition 
      ? Number(suilendPosition.yieldEarned) / 1_000_000 
      : 0;

    const totalBalance = poolBalance + inSuilend;

    // Determine if rebalancing is needed
    let needsRebalance = false;
    let action: 'deposit' | 'withdraw' | 'none' = 'none';
    let amount = 0;

    if (poolBalance > this.config.maxPoolBalance) {
      // Too much in pool, deposit excess to Suilend
      needsRebalance = true;
      action = 'deposit';
      amount = poolBalance - this.config.targetPoolBalance;
    } else if (poolBalance < this.config.minPoolBalance && inSuilend > 0) {
      // Too little in pool, withdraw from Suilend
      needsRebalance = true;
      action = 'withdraw';
      amount = Math.min(
        this.config.targetPoolBalance - poolBalance,
        inSuilend
      );
    }

    return {
      totalBalance,
      inPool: poolBalance,
      inSuilend,
      yieldEarned,
      needsRebalance,
      action,
      amount
    };
  }

  /**
   * Check pool status and rebalance if needed
   */
  private async checkAndRebalance(): Promise<void> {
    try {
      console.log('\n⏰ Running rebalance check...');
      
      const stats = await this.getPoolStats();
      
      console.log('📊 Pool Status:');
      console.log(`   Total Balance: $${stats.totalBalance.toFixed(2)}`);
      console.log(`   In Pool: $${stats.inPool.toFixed(2)}`);
      console.log(`   In Suilend: $${stats.inSuilend.toFixed(2)}`);
      console.log(`   Yield Earned: $${stats.yieldEarned.toFixed(2)}`);

      if (stats.needsRebalance) {
        console.log(`\n🔄 Rebalancing needed!`);
        console.log(`   Action: ${stats.action.toUpperCase()}`);
        console.log(`   Amount: $${stats.amount.toFixed(2)}`);

        if (stats.action === 'deposit') {
          await this.depositToSuilend(stats.amount);
        } else if (stats.action === 'withdraw') {
          await this.withdrawFromSuilend(stats.amount);
        }
      } else {
        console.log('✅ Pool is balanced, no action needed');
      }

    } catch (error) {
      console.error('❌ Error during rebalance check:', error);
    }
  }

  /**
   * Deposit USDC from pool to Suilend
   */
  private async depositToSuilend(amount: number): Promise<void> {
    try {
      console.log(`\n💰 Depositing $${amount.toFixed(2)} to Suilend...`);

      const adminAddress = this.config.adminKeypair.toSuiAddress();
      
      // Create deposit transaction
      const depositTx = await suilendService.depositUSDC(adminAddress, amount);

      // Execute transaction
      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.config.adminKeypair,
        transaction: depositTx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ Successfully deposited $${amount.toFixed(2)} to Suilend`);
        console.log(`   Tx Digest: ${result.digest}`);
      } else {
        console.error('❌ Deposit transaction failed:', result.effects?.status);
      }

    } catch (error) {
      console.error('❌ Error depositing to Suilend:', error);
      throw error;
    }
  }

  /**
   * Withdraw USDC from Suilend to pool
   */
  private async withdrawFromSuilend(amount: number): Promise<void> {
    try {
      console.log(`\n💸 Withdrawing $${amount.toFixed(2)} from Suilend...`);

      const adminAddress = this.config.adminKeypair.toSuiAddress();
      
      // Get obligation ID
      const obligationId = await suilendService.getUserObligation(adminAddress);
      
      if (!obligationId) {
        throw new Error('No Suilend obligation found');
      }

      // Create withdrawal transaction
      const withdrawTx = await suilendService.withdrawUSDC(
        adminAddress,
        amount,
        obligationId
      );

      // Execute transaction
      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.config.adminKeypair,
        transaction: withdrawTx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ Successfully withdrew $${amount.toFixed(2)} from Suilend`);
        console.log(`   Tx Digest: ${result.digest}`);
      } else {
        console.error('❌ Withdrawal transaction failed:', result.effects?.status);
      }

    } catch (error) {
      console.error('❌ Error withdrawing from Suilend:', error);
      throw error;
    }
  }

  /**
   * Get current pool balance
   * This queries your lottery pool contract
   */
  private async getPoolBalance(): Promise<number> {
    try {
      // Query the pool object
      const poolObject = await this.suiClient.getObject({
        id: this.config.poolObjectId,
        options: { showContent: true }
      });

      if (!poolObject.data?.content || poolObject.data.content.dataType !== 'moveObject') {
        throw new Error('Invalid pool object');
      }

      // Extract balance from the pool's fields
      // Adjust this based on your actual pool structure
      const fields = poolObject.data.content.fields as any;
      const balanceField = fields.balance;
      
      // The balance is likely stored as a Balance<USDC> object
      // You'll need to query it to get the actual value
      if (typeof balanceField === 'object' && 'fields' in balanceField) {
        const value = balanceField.fields.value;
        return Number(value) / 1_000_000; // Convert from base units
      }

      return 0;
    } catch (error) {
      console.error('❌ Error fetching pool balance:', error);
      return 0;
    }
  }

  /**
   * Manual rebalance trigger
   */
  async rebalanceNow(): Promise<void> {
    console.log('🔄 Manual rebalance triggered');
    await this.checkAndRebalance();
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; config: RebalancerConfig } {
    return {
      isRunning: this.isRunning,
      config: this.config
    };
  }
}

// Example usage:
/*
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Load admin keypair (in production, load from secure storage)
const adminKeypair = Ed25519Keypair.fromSecretKey(process.env.ADMIN_SECRET_KEY!);

// Configure rebalancer
const rebalancer = new PoolRebalancer({
  poolObjectId: '0x40657e11ee41a3347c204a2fc98a0a48e010a745ecc7d4ed2539641a6a5ff66e',
  adminKeypair: adminKeypair,
  minPoolBalance: 10,        // Keep at least $10 in pool
  targetPoolBalance: 20,     // Target $20 in pool
  maxPoolBalance: 50,        // Deposit to Suilend if > $50
  checkIntervalMs: 60000,    // Check every minute
  rpcUrl: 'https://fullnode.mainnet.sui.io'
});

// Start the keeper
await rebalancer.start();

// Get current stats
const stats = await rebalancer.getPoolStats();
console.log('Pool Stats:', stats);

// Manually trigger rebalance
await rebalancer.rebalanceNow();

// Stop when done
rebalancer.stop();
*/
