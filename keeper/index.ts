import { SuiClient } from '@mysten/sui/client';
import { createPoolRebalancer } from './PoolRebalancer';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import dotenv from 'dotenv';
import { createDrawScheduler } from './DrawScheduler';
import { WithdrawalFulfiller } from './WithdrawalFulfiller';
import { NaviService } from './NaviService';

console.log('Loading .env file...');
dotenv.config({ path: '.env' });
console.log('✅ .env loaded');

async function main() {
  console.log('Environment variables:');
  console.log('- VITE_ADMIN_SECRET_KEY:', process.env.VITE_ADMIN_SECRET_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('- VITE_POOL_OBJECT_ID:', process.env.VITE_POOL_OBJECT_ID);
  console.log();

  console.log('🚀 Starting LuckyVault Pool Keeper...');
  console.log();

  const rpcUrl = process.env.VITE_SUI_RPC_URL || 'https://sui-mainnet.nodeinfra.com';
  const suiClient = new SuiClient({ url: rpcUrl });

  console.log('Creating keypair from suiprivkey...');
  const { schema, secretKey } = decodeSuiPrivateKey(process.env.VITE_ADMIN_SECRET_KEY!);
  const adminKeypair = Ed25519Keypair.fromSecretKey(secretKey);
  const adminAddress = adminKeypair.toSuiAddress();
  const naviService = new NaviService(suiClient, adminKeypair);

  console.log('👤 Admin Address:', adminAddress);

  const expectedAddress = '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382';
  if (adminAddress !== expectedAddress) {
    console.error('❌ Address mismatch!');
    process.exit(1);
  }

  console.log('✅ Address verified');
  console.log();

  await naviService.initialize();

  const rebalancer = createPoolRebalancer(suiClient, adminKeypair, naviService);
  await rebalancer.start();

  const withdrawalFulfiller = new WithdrawalFulfiller(suiClient, adminKeypair, naviService);
  await withdrawalFulfiller.start();

  const scheduler = createDrawScheduler(
    suiClient,
    adminKeypair,
    process.env.VITE_POOL_OBJECT_ID!
  );
  await scheduler.start();

  console.log('✅ All services started!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
