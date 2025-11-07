import { PoolRebalancer } from './PoolRebalancer.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';

dotenv.config({ path: '../frontend/.env' });

async function main() {
  console.log('🚀 Starting LuckyVault Pool Keeper...\n');

  const secretKey = process.env.VITE_ADMIN_SECRET_KEY;
  if (!secretKey) {
    console.error('❌ VITE_ADMIN_SECRET_KEY not set in .env file');
    process.exit(1);
  }

  const adminKeypair = Ed25519Keypair.fromSecretKey(
    Buffer.from(secretKey, 'hex')
  );
  console.log(`👤 Admin Address: ${adminKeypair.toSuiAddress()}\n`);

  const rebalancer = new PoolRebalancer({
    poolObjectId: process.env.VITE_POOL_OBJECT_ID!,
    adminKeypair: adminKeypair,
    minPoolBalance: Number(process.env.VITE_MIN_POOL_BALANCE || 10),
    targetPoolBalance: Number(process.env.VITE_TARGET_POOL_BALANCE || 20),
    maxPoolBalance: Number(process.env.VITE_MAX_POOL_BALANCE || 50),
    checkIntervalMs: Number(process.env.VITE_CHECK_INTERVAL_MS || 60000),
    rpcUrl: process.env.VITE_SUI_RPC_URL!
  });

  await rebalancer.start();

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    rebalancer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    rebalancer.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
