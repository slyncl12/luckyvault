import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const SUILEND_MARKET = '0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8';
const USDC_RESERVE = '2';

export class SuilendWithdrawer {
  constructor(
    private client: SuiClient,
    private adminKeypair: Ed25519Keypair,
    private packageId: string,
    private adminCap: string,
    private poolId: string,
    private trackerId: string,
    private usdcType: string
  ) {}

  async withdrawFromSuilend(amount: number): Promise<string> {
    console.log(`   📥 Step 1: Redeem cTokens from Suilend for $${(amount / 1_000_000).toFixed(2)}`);
    
    // Step 1: Find cToken obligation
    const adminObligations = await this.client.getOwnedObjects({
      owner: this.adminKeypair.toSuiAddress(),
      filter: {
        StructType: `0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8::lending_market::Obligation`
      },
      options: { showContent: true }
    });
    
    if (adminObligations.data.length === 0) {
      throw new Error('No Suilend obligation found');
    }
    
    const obligationId = adminObligations.data[0].data?.objectId;
    
    // Step 2: Redeem from Suilend
    const tx1 = new Transaction();
    tx1.moveCall({
      target: '0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8::lending_market::redeem_ctokens_and_withdraw_liquidity',
      typeArguments: [this.usdcType],
      arguments: [
        tx1.object(SUILEND_MARKET),
        tx1.pure.u64(USDC_RESERVE),
        tx1.object('0x6'),
        tx1.object(obligationId!),
        tx1.pure.u64(amount),
      ],
    });
    
    const result1 = await this.client.signAndExecuteTransaction({
      transaction: tx1,
      signer: this.adminKeypair,
    });
    
    console.log(`   💰 Step 2: Deposit back to pool`);
    
    // Step 3: Get the USDC and deposit back to pool
    const coins = await this.client.getCoins({
      owner: this.adminKeypair.toSuiAddress(),
      coinType: this.usdcType
    });
    
    const tx2 = new Transaction();
    const [coin] = tx2.splitCoins(tx2.object(coins.data[0].coinObjectId), [amount]);
    
    tx2.moveCall({
      target: `${this.packageId}::lottery_personal::admin_deposit_from_suilend`,
      typeArguments: [this.usdcType],
      arguments: [
        tx2.object(this.adminCap),
        tx2.object(this.poolId),
        coin,
        tx2.object('0x6'),
      ],
    });
    
    await this.client.signAndExecuteTransaction({
      transaction: tx2,
      signer: this.adminKeypair,
    });
    
    console.log(`   📝 Step 3: Record withdrawal in tracker`);
    
    // Step 4: Record in tracker
    const tx3 = new Transaction();
    tx3.moveCall({
      target: `${this.packageId}::lottery_personal::admin_record_suilend_withdrawal`,
      typeArguments: [this.usdcType],
      arguments: [
        tx3.object(this.adminCap),
        tx3.object(this.trackerId),
        tx3.pure.u64(amount),
        tx3.pure.u64(0), // yield earned (calculate properly later)
        tx3.object('0x6'),
      ],
    });
    
    await this.client.signAndExecuteTransaction({
      transaction: tx3,
      signer: this.adminKeypair,
    });
    
    return result1.digest;
  }
}
