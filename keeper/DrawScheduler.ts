import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { suilendService } from './SuilendService';

interface PrizeConfig {
  hourlyPercent: number;   // % of total yield
  dailyPercent: number;
  weeklyPercent: number;
  monthlyPercent: number;
}

export class DrawScheduler {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private poolObjectId: string;
  private isRunning = false;
  
  // Prize allocation (% of total available yield)
  private prizeConfig: PrizeConfig = {
    hourlyPercent: 1,    // 1% of yield pool
    dailyPercent: 5,     // 5% of yield pool
    weeklyPercent: 20,   // 20% of yield pool
    monthlyPercent: 50,  // 50% of yield pool
  };
  
  // Track last draw times
  private lastHourlyDraw = 0;
  private lastDailyDraw = 0;
  private lastWeeklyDraw = 0;
  private lastMonthlyDraw = 0;

  constructor(
    suiClient: SuiClient,
    keypair: Ed25519Keypair,
    poolObjectId: string
  ) {
    this.suiClient = suiClient;
    this.keypair = keypair;
    this.poolObjectId = poolObjectId;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Draw Scheduler already running');
      return;
    }

    console.log('🎰 Starting Draw Scheduler...');
    console.log('   Hourly draws: Every hour at :00 (1% of yield)');
    console.log('   Daily draws: Every day at midnight UTC (5% of yield)');
    console.log('   Weekly draws: Every Sunday at midnight UTC (20% of yield)');
    console.log('   Monthly draws: 1st of month at midnight UTC (50% of yield)');

    this.isRunning = true;

    // Check for draws every minute
    setInterval(async () => {
      await this.checkDraws();
    }, 60000);

    // Run initial check
    await this.checkDraws();

    console.log('✅ Draw Scheduler started\n');
  }

  private async checkDraws(): Promise<void> {
    try {
      const now = Date.now();
      const currentDate = new Date(now);
      const currentMinute = currentDate.getUTCMinutes();
      const currentHour = currentDate.getUTCHours();
      const currentDay = currentDate.getUTCDate();
      const currentDayOfWeek = currentDate.getUTCDay(); // 0 = Sunday

      // Hourly draw - every hour at :00
      if (currentMinute === 0) {
        const hoursSince = (now - this.lastHourlyDraw) / (60 * 60 * 1000);
        if (hoursSince >= 1) {
          console.log('⏰ Time for HOURLY draw!');
          await this.executeHourlyDraw();
          this.lastHourlyDraw = now;
        }
      }

      // Daily draw - midnight UTC
      if (currentHour === 0 && currentMinute === 0) {
        const daysSince = (now - this.lastDailyDraw) / (24 * 60 * 60 * 1000);
        if (daysSince >= 1) {
          console.log('🌅 Time for DAILY draw!');
          await this.executeDailyDraw();
          this.lastDailyDraw = now;
        }
      }

      // Weekly draw - Sunday at midnight UTC
      if (currentDayOfWeek === 0 && currentHour === 0 && currentMinute === 0) {
        const weeksSince = (now - this.lastWeeklyDraw) / (7 * 24 * 60 * 60 * 1000);
        if (weeksSince >= 1) {
          console.log('📅 Time for WEEKLY draw!');
          await this.executeWeeklyDraw();
          this.lastWeeklyDraw = now;
        }
      }

      // Monthly draw - 1st of month at midnight UTC
      if (currentDay === 1 && currentHour === 0 && currentMinute === 0) {
        const monthsSince = (now - this.lastMonthlyDraw) / (30 * 24 * 60 * 60 * 1000);
        if (monthsSince >= 1) {
          console.log('🎊 Time for MONTHLY draw!');
          await this.executeMonthlyDraw();
          this.lastMonthlyDraw = now;
        }
      }
    } catch (error) {
      console.error('❌ Error checking draws:', error);
    }
  }

  private async executeHourlyDraw(): Promise<void> {
    try {
      console.log('🎲 Executing HOURLY draw...');

      const tx = new Transaction();
      tx.moveCall({
        target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::execute_hourly_draw`,
        typeArguments: [process.env.VITE_USDC_TYPE!],
        arguments: [
          tx.object(process.env.VITE_ADMIN_CAP_ID!),
          tx.object(this.poolObjectId),
          tx.object(process.env.VITE_DRAW_CONFIG_ID!),
          tx.object(process.env.VITE_SUILEND_TRACKER_ID!),
          tx.object('0x8'), // Random
          tx.object('0x6'), // Clock
        ],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('✅ Hourly draw executed!');
      console.log('   Transaction:', result.digest);

      await this.processDrawResult(result.events || [], 'HOURLY', this.prizeConfig.hourlyPercent);

    } catch (error) {
      console.error('❌ Failed to execute hourly draw:', error);
    }
  }

  private async executeDailyDraw(): Promise<void> {
    try {
      console.log('🎲 Executing DAILY draw...');

      const tx = new Transaction();
      tx.moveCall({
        target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::execute_daily_draw`,
        typeArguments: [process.env.VITE_USDC_TYPE!],
        arguments: [
          tx.object(process.env.VITE_ADMIN_CAP_ID!),
          tx.object(this.poolObjectId),
          tx.object(process.env.VITE_DRAW_CONFIG_ID!),
          tx.object(process.env.VITE_SUILEND_TRACKER_ID!),
          tx.object('0x8'),
          tx.object('0x6'),
        ],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('✅ Daily draw executed!');
      console.log('   Transaction:', result.digest);

      await this.processDrawResult(result.events || [], 'DAILY', this.prizeConfig.dailyPercent);

    } catch (error) {
      console.error('❌ Failed to execute daily draw:', error);
    }
  }

  private async executeWeeklyDraw(): Promise<void> {
    try {
      console.log('🎲 Executing WEEKLY draw...');

      const tx = new Transaction();
      tx.moveCall({
        target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::execute_weekly_draw`,
        typeArguments: [process.env.VITE_USDC_TYPE!],
        arguments: [
          tx.object(process.env.VITE_ADMIN_CAP_ID!),
          tx.object(this.poolObjectId),
          tx.object(process.env.VITE_DRAW_CONFIG_ID!),
          tx.object(process.env.VITE_SUILEND_TRACKER_ID!),
          tx.object('0x8'),
          tx.object('0x6'),
        ],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('✅ Weekly draw executed!');
      console.log('   Transaction:', result.digest);

      await this.processDrawResult(result.events || [], 'WEEKLY', this.prizeConfig.weeklyPercent);

    } catch (error) {
      console.error('❌ Failed to execute weekly draw:', error);
    }
  }

  private async executeMonthlyDraw(): Promise<void> {
    try {
      console.log('🎲 Executing MONTHLY draw...');

      const tx = new Transaction();
      tx.moveCall({
        target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::execute_monthly_draw`,
        typeArguments: [process.env.VITE_USDC_TYPE!],
        arguments: [
          tx.object(process.env.VITE_ADMIN_CAP_ID!),
          tx.object(this.poolObjectId),
          tx.object(process.env.VITE_DRAW_CONFIG_ID!),
          tx.object(process.env.VITE_SUILEND_TRACKER_ID!),
          tx.object('0x8'),
          tx.object('0x6'),
        ],
      });

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('✅ Monthly draw executed!');
      console.log('   Transaction:', result.digest);

      await this.processDrawResult(result.events || [], 'MONTHLY', this.prizeConfig.monthlyPercent);

    } catch (error) {
      console.error('❌ Failed to execute monthly draw:', error);
    }
  }

  private async processDrawResult(events: any[], drawType: string, prizePercent: number): Promise<void> {
    console.log(`🔍 Checking for ${drawType} winner...`);
    
    for (const event of events) {
      if (event.type && (event.type.includes('DrawExecuted') || event.type.includes('DrawEvent'))) {
        const winner = event.parsedJson?.winner;
        
        if (winner) {
          console.log('🎉 WINNER FOUND!');
          console.log(`   🏆 Winner: ${winner}`);
          console.log(`   🎰 Draw Type: ${drawType}`);
          console.log(`   💰 Prize: ${prizePercent}% of yield pool`);
          
          // Distribute prize
          await this.distributePrize(winner, drawType, prizePercent);
        } else {
          console.log('   No winner this draw (no participants or draw conditions not met)');
        }
      }
    }
  }

  private async distributePrize(winner: string, drawType: string, prizePercent: number): Promise<void> {
    try {
      console.log(`💰 Calculating ${drawType} prize (${prizePercent}% of yield)...`);

      // Step 1: Calculate available yield
      const yieldAvailable = await this.calculateAvailableYield();
      
      if (yieldAvailable <= 0) {
        console.log('⚠️  No yield available yet - prize will be paid when yield accumulates');
        return;
      }

      // Step 2: Calculate prize amount
      const prizeAmount = (yieldAvailable * prizePercent) / 100;
      const prizeInMicro = Math.floor(prizeAmount * 1_000_000);

      console.log(`   Available Yield: $${yieldAvailable.toFixed(2)}`);
      console.log(`   Prize Amount: $${prizeAmount.toFixed(2)} (${prizePercent}%)`);

      if (prizeAmount < 0.01) {
        console.log('⚠️  Prize too small (< $0.01) - waiting for more yield');
        return;
      }

      // Step 3: Withdraw prize from Suilend
      console.log('📤 Withdrawing prize from Suilend...');
      await this.withdrawPrizeFromSuilend(prizeAmount);

      // Step 4: Send prize to winner
      console.log(`💸 Sending $${prizeAmount.toFixed(2)} to winner ${winner}...`);
      await this.sendPrizeToWinner(winner, prizeInMicro);

      console.log('✅ Prize distributed successfully!');
      console.log(`   🎊 ${winner} won $${prizeAmount.toFixed(2)} in ${drawType} draw!`);

    } catch (error) {
      console.error('❌ Failed to distribute prize:', error);
    }
  }

  private async calculateAvailableYield(): Promise<number> {
    try {
      // Get current Suilend position value
      const position = await suilendService.getUserPosition(this.keypair.toSuiAddress());
      if (!position) return 0;

      const currentValue = parseFloat(position.currentValue) / 1_000_000;

      // Get tracked deposit amount from contract
      const trackerObj = await this.suiClient.getObject({
        id: process.env.VITE_SUILEND_TRACKER_ID!,
        options: { showContent: true }
      });
      const trackerFields = (trackerObj.data?.content as any)?.fields;
      const trackedDeposit = parseInt(trackerFields?.deposited_to_suilend || '0') / 1_000_000;

      // Yield = Current Value - Principal
      const yieldAvailable = Math.max(0, currentValue - trackedDeposit);

      console.log(`   📊 Suilend Value: $${currentValue.toFixed(2)}`);
      console.log(`   📊 Tracked Principal: $${trackedDeposit.toFixed(2)}`);
      console.log(`   📊 Available Yield: $${yieldAvailable.toFixed(2)}`);

      return yieldAvailable;

    } catch (error) {
      console.error('Error calculating yield:', error);
      return 0;
    }
  }

  private async withdrawPrizeFromSuilend(amount: number): Promise<string> {
    try {
      // Get Suilend position
      const position = await suilendService.getUserPosition(this.keypair.toSuiAddress());
      if (!position) {
        throw new Error('No Suilend position found');
      }

      // Withdraw from Suilend
      const tx = await suilendService.withdrawUSDC(
        this.keypair.toSuiAddress(),
        amount,
        position.obligationId
      );

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log('   ✅ Withdrew from Suilend:', result.digest);

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Find the withdrawn USDC coin
      const coins = await this.suiClient.getCoins({
        owner: this.keypair.toSuiAddress(),
        coinType: process.env.VITE_USDC_TYPE!
      });

      const withdrawnCoin = coins.data.find(c => parseInt(c.balance) >= amount * 1_000_000);

      if (!withdrawnCoin) {
        throw new Error('Could not find withdrawn USDC coin');
      }

      return withdrawnCoin.coinObjectId;

    } catch (error) {
      console.error('Error withdrawing from Suilend:', error);
      throw error;
    }
  }

  private async sendPrizeToWinner(winner: string, amountMicro: number): Promise<void> {
    try {
      // Get admin's USDC coins
      const coins = await this.suiClient.getCoins({
        owner: this.keypair.toSuiAddress(),
        coinType: process.env.VITE_USDC_TYPE!
      });

      if (coins.data.length === 0) {
        throw new Error('No USDC coins found in admin wallet');
      }

      // Find a coin with sufficient balance
      const coin = coins.data.find(c => parseInt(c.balance) >= amountMicro);
      if (!coin) {
        throw new Error('Insufficient USDC balance');
      }

      // Send prize to winner
      const tx = new Transaction();
      
      const [splitCoin] = tx.splitCoins(tx.object(coin.coinObjectId), [tx.pure.u64(amountMicro)]);
      
      tx.transferObjects([splitCoin], tx.pure.address(winner));

      const result = await this.suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: { showEffects: true },
      });

      console.log('   ✅ Prize sent to winner:', result.digest);

      // Update tracker to record yield withdrawal
      await this.updateYieldTracker(amountMicro);

    } catch (error) {
      console.error('Error sending prize to winner:', error);
      throw error;
    }
  }

  private async updateYieldTracker(yieldWithdrawnMicro: number): Promise<void> {
    try {
      const trackTx = new Transaction();
      trackTx.moveCall({
        target: `${process.env.VITE_POOL_PACKAGE_ID}::lottery_personal::admin_record_suilend_withdrawal`,
        typeArguments: [process.env.VITE_USDC_TYPE!],
        arguments: [
          trackTx.object(process.env.VITE_ADMIN_CAP_ID!),
          trackTx.object(process.env.VITE_SUILEND_TRACKER_ID!),
          trackTx.pure.u64(0), // No principal withdrawn
          trackTx.pure.u64(yieldWithdrawnMicro), // Yield withdrawn for prize
          trackTx.object('0x6'),
        ],
      });

      await this.suiClient.signAndExecuteTransaction({
        transaction: trackTx,
        signer: this.keypair,
        options: { showEffects: true },
      });

      console.log('   ✅ Yield tracker updated');

    } catch (error) {
      console.error('Error updating yield tracker:', error);
    }
  }
}

export function createDrawScheduler(
  suiClient: SuiClient,
  keypair: Ed25519Keypair,
  poolObjectId: string
): DrawScheduler {
  return new DrawScheduler(suiClient, keypair, poolObjectId);
}
