  async fulfillWithdrawal(requestId: string, amount: number) {
    console.log(`💸 Fulfilling withdrawal request: $${(amount / 1_000_000).toFixed(2)}`);
    
    try {
      console.log('   📤 Step 1: Creating transaction with NAVI withdrawal...');
      
      const tx = new Transaction();
      
      // Step 1: Withdraw from NAVI (adds to transaction)
      const usdcCoin = await this.naviService.withdraw(tx, amount);
      
      // Step 2: Record NAVI withdrawal in tracker
      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::admin_record_suilend_withdrawal`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(TRACKER_ID),
          tx.pure.u64(amount),
          tx.pure.u64(0), // yield_earned
          tx.object(CLOCK_ID)
        ]
      });

      // Step 3: Fulfill the withdrawal request
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

      console.log('   📝 Step 2: Executing transaction...');
      const result = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
        options: { showEffects: true }
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`   ✅ Withdrawal fulfilled! Digest: ${result.digest}`);
        return true;
      } else {
        console.log(`   ❌ Transaction failed:`, result.effects?.status);
        return false;
      }
    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
      return false;
    }
  }
