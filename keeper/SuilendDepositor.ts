import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const SUILEND_PACKAGE = '0x34171e8092d831c1cb71d70b04389f9a0fec8af56f69e760b58d613d764c6945';
const POOL_TYPE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL';
const MAIN_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1';
const USDC_RESERVE = 0;

export class SuilendDepositor {
  constructor(
    private client: SuiClient,
    private adminKeypair: Ed25519Keypair,
    private packageId: string,
    private adminCap: string,
    private poolId: string,
    private trackerId: string,
    private usdcType: string
  ) {}

  async depositToSuilend(amount: number): Promise<string> {
    console.log(`   📤 Step 1: Withdraw $${(amount / 1_000_000).toFixed(2)} from pool`);
    
    const tx1 = new Transaction();
    tx1.moveCall({
      target: `${this.packageId}::lottery_personal::admin_withdraw_for_suilend`,
      typeArguments: [this.usdcType],
      arguments: [
        tx1.object(this.adminCap),
        tx1.object(this.poolId),
        tx1.pure.u64(amount),
        tx1.object('0x6'),
      ],
    });
    
    await this.client.signAndExecuteTransaction({
      transaction: tx1,
      signer: this.adminKeypair,
    });
    
    console.log(`   💰 Step 2: Deposit to Suilend`);
    
    const coins = await this.client.getCoins({
      owner: this.adminKeypair.toSuiAddress(),
      coinType: this.usdcType
    });
    
    const tx2 = new Transaction();
    const [coin] = tx2.splitCoins(tx2.object(coins.data[0].coinObjectId), [amount]);
    
    tx2.moveCall({
      target: `${SUILEND_PACKAGE}::lending_market::deposit_liquidity_and_mint_ctokens`,
      typeArguments: [POOL_TYPE, this.usdcType],
      arguments: [
        tx2.object(MAIN_MARKET),
        tx2.pure.u64(USDC_RESERVE),
        tx2.object('0x6'),
        coin,
      ],
    });
    
    const result2 = await this.client.signAndExecuteTransaction({
      transaction: tx2,
      signer: this.adminKeypair,
    });
    
    console.log(`   📝 Step 3: Record in tracker`);
    
    const tx3 = new Transaction();
    tx3.moveCall({
      target: `${this.packageId}::lottery_personal::admin_record_suilend_deposit`,
      typeArguments: [this.usdcType],
      arguments: [
        tx3.object(this.adminCap),
        tx3.object(this.trackerId),
        tx3.pure.u64(amount),
        tx3.object('0x6'),
      ],
    });
    
    await this.client.signAndExecuteTransaction({
      transaction: tx3,
      signer: this.adminKeypair,
    });
    
    return result2.digest;
  }
}
