/**
 * NAVI Protocol Integration Service
 * Simplified working version for LuckyVault keeper
 */

import { getPools, depositCoinPTB, withdrawCoinPTB, createAccountCapPTB } from '@naviprotocol/lending';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const SUI_RPC_URL = 'https://fullnode.mainnet.sui.io';

export interface NaviPoolStats {
  supplyAPY: number;
  borrowAPY: number;
  utilizationRate: number;
  totalSupply: string;
  totalBorrow: string;
  availableLiquidity: string;
}

export interface NaviPosition {
  depositedAmount: string;
  currentValue: string;
  yieldEarned: string;
}

export class NaviService {
  private suiClient: SuiClient;
  private lastAPY: number = 0;
  private lastAPYUpdate: number = 0;
  private APY_CACHE_MS = 60000;

  constructor() {
    this.suiClient = new SuiClient({ url: SUI_RPC_URL });
  }

  async getUSDCSupplyAPY(): Promise<number> {
    const now = Date.now();
    if (this.lastAPY > 0 && (now - this.lastAPYUpdate) < this.APY_CACHE_MS) {
      return this.lastAPY;
    }

    try {
      const pools = await getPools({
        env: 'prod',
        cacheTime: 60000
      });

      const usdcPool = pools.find(p =>
        p.token?.symbol === 'USDC' ||
        p.coinType?.includes('dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7')
      );

      if (!usdcPool) {
        throw new Error('USDC pool not found in NAVI');
      }

      const apyString = usdcPool.supplyIncentiveApyInfo?.apy;
      if (!apyString) {
        throw new Error('APY data not available');
      }

      this.lastAPY = parseFloat(apyString);
      this.lastAPYUpdate = now;

      console.log(`✅ NAVI Real-time APY: ${this.lastAPY.toFixed(2)}%`);
      return this.lastAPY;

    } catch (error) {
      console.error('❌ Error fetching NAVI APY:', error);
      if (this.lastAPY > 0) {
        console.log(`⚠️  Using cached APY: ${this.lastAPY.toFixed(2)}%`);
        return this.lastAPY;
      }
      throw error;
    }
  }

  async getUSDCPoolStats(): Promise<NaviPoolStats> {
    try {
      const pools = await getPools({ env: 'prod' });
      const usdcPool = pools.find(p => p.token?.symbol === 'USDC');

      if (!usdcPool) {
        throw new Error('USDC pool not found');
      }

      const supplyAPY = parseFloat(usdcPool.supplyIncentiveApyInfo?.apy || '0');
      const borrowAPY = parseFloat(usdcPool.borrowIncentiveApyInfo?.apy || '0');

      const totalSupply = parseFloat(usdcPool.totalSupply || '0');
      const totalBorrow = parseFloat(usdcPool.totalBorrow || '0');
      const utilizationRate = totalSupply > 0 ? totalBorrow / totalSupply : 0;

      return {
        supplyAPY,
        borrowAPY,
        utilizationRate,
        totalSupply: usdcPool.totalSupply || '0',
        totalBorrow: usdcPool.totalBorrow || '0',
        availableLiquidity: usdcPool.availableBorrow || '0'
      };
    } catch (error) {
      console.error('❌ Error fetching pool stats:', error);
      return {
        supplyAPY: 0,
        borrowAPY: 0,
        utilizationRate: 0,
        totalSupply: '0',
        totalBorrow: '0',
        availableLiquidity: '0'
      };
    }
  }

  async initialize(): Promise<void> {
    console.log('✅ NAVI service initializing...');

    try {
      const apy = await this.getUSDCSupplyAPY();
      console.log(`   ✅ Live USDC Supply APY: ${apy.toFixed(2)}%`);

      const stats = await this.getUSDCPoolStats();
      console.log(`   📊 Borrow APY: ${stats.borrowAPY.toFixed(2)}%`);
      console.log(`   📊 Utilization: ${(stats.utilizationRate * 100).toFixed(2)}%`);
    } catch (error) {
      console.error('❌ FAILED TO GET LIVE APY:', error);
    }
  }

  async getUserPosition(userAddress: string): Promise<NaviPosition | null> {
    try {
      return {
        depositedAmount: '0',
        currentValue: '0',
        yieldEarned: '0'
      };
    } catch (error) {
      console.error('Error getting user position:', error);
      return null;
    }
  }

  async depositToNavi(keypair: any, usdcCoinId: string, amount: number): Promise<void> {
    try {
      const userAddress = keypair.toSuiAddress();
      console.log(`   📤 Depositing ${(amount / 1_000_000).toFixed(2)} USDC to NAVI...`);
      console.log(`   📍 Coin ID: ${usdcCoinId}`);
      console.log(`   👤 User: ${userAddress}`);

      const { depositCoinPTB } = await import('@naviprotocol/lending');
      const { Transaction } = await import('@mysten/sui/transactions');

      const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

      const tx = new Transaction();

      await depositCoinPTB(
        tx,
        USDC_TYPE,
        usdcCoinId,
        amount
      );

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true
        }
      });

      console.log('   ✅ NAVI deposit successful!');
      console.log('   📝 Transaction:', result.digest);

      if (result.effects?.status?.status === 'failure') {
        throw new Error(`Transaction failed: ${result.effects.status.error}`);
      }

    } catch (error) {
      console.error('   ❌ NAVI deposit failed:', error);
      throw error;
    }
  }

  async withdrawFromNavi(userAddress: string, amount: number): Promise<Transaction> {
    const { withdrawCoinPTB } = await import('@naviprotocol/lending');
    const { Transaction } = await import('@mysten/sui/transactions');

    const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

    const tx = new Transaction();

    // Withdraw from NAVI - returns array with withdrawn coin
    const [withdrawnCoin] = await withdrawCoinPTB(
      tx,
      USDC_TYPE,
      Math.floor(amount * 1_000_000)
    );

    // Transfer the withdrawn coin to user
    tx.transferObjects([withdrawnCoin], userAddress);

    return tx;
  }

  formatUSDC(amount: string | bigint): string {
    const value = Number(amount) / 1_000_000;
    return value.toFixed(2);
  }

  calculateDailyEarnings(balance: bigint, apy: number): bigint {
    const dailyRate = apy / 365 / 100;
    const earnings = Number(balance) * dailyRate;
    return BigInt(Math.floor(earnings));
  }

  calculateMonthlyEarnings(balance: bigint, apy: number): bigint {
    const monthlyRate = apy / 12 / 100;
    const earnings = Number(balance) * monthlyRate;
    return BigInt(Math.floor(earnings));
  }

  async withdraw(tx: Transaction, amount: number): Promise<any> {
    console.log(`   📤 Withdrawing ${(amount / 1_000_000).toFixed(2)} USDC from NAVI...`);
    
    try {
      const { withdrawCoinPTB } = await import("@naviprotocol/lending");
      const USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
      
      const [withdrawnCoin] = await withdrawCoinPTB(tx, USDC_TYPE, amount);
      
      console.log(`   ✅ NAVI withdrawal added to transaction`);
      return withdrawnCoin;
      
    } catch (error: any) {
      console.error(`   ❌ NAVI withdraw error:`, error.message);
      throw error;
    }
  }
}
