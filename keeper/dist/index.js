import { PoolRebalancer } from './PoolRebalancer.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';
// Load environment variables
console.log('Loading .env file...');
const result = dotenv.config({ path: '../frontend/.env' });
if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
    process.exit(1);
}
console.log('✅ .env loaded');
console.log('Environment variables:');
console.log('- VITE_ADMIN_SECRET_KEY:', process.env.VITE_ADMIN_SECRET_KEY ? 'SET' : 'NOT SET');
console.log('- VITE_POOL_OBJECT_ID:', process.env.VITE_POOL_OBJECT_ID);
console.log('- VITE_SUI_RPC_URL:', process.env.VITE_SUI_RPC_URL);
async function main() {
    console.log('\n🚀 Starting LuckyVault Pool Keeper...\n');
    // Load admin keypair
    const secretKey = process.env.VITE_ADMIN_SECRET_KEY;
    if (!secretKey) {
        console.error('❌ VITE_ADMIN_SECRET_KEY not set in .env file');
        process.exit(1);
    }
    if (secretKey === 'your_admin_secret_key_here') {
        console.error('❌ Please update VITE_ADMIN_SECRET_KEY in .env file with your actual key');
        console.error('Run: sui keytool export --key-scheme ed25519 --address 0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4');
        process.exit(1);
    }
    console.log('Creating keypair from secret...');
    let adminKeypair;
    try {
        adminKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(secretKey, 'hex'));
        console.log(`👤 Admin Address: ${adminKeypair.toSuiAddress()}\n`);
    }
    catch (error) {
        console.error('❌ Error creating keypair:', error);
        console.error('Make sure your secret key is valid hex format');
        process.exit(1);
    }
    // Configure rebalancer
    const rebalancer = new PoolRebalancer({
        poolObjectId: process.env.VITE_POOL_OBJECT_ID,
        adminKeypair: adminKeypair,
        minPoolBalance: Number(process.env.VITE_MIN_POOL_BALANCE || 10),
        targetPoolBalance: Number(process.env.VITE_TARGET_POOL_BALANCE || 20),
        maxPoolBalance: Number(process.env.VITE_MAX_POOL_BALANCE || 50),
        checkIntervalMs: Number(process.env.VITE_CHECK_INTERVAL_MS || 60000),
        rpcUrl: process.env.VITE_SUI_RPC_URL
    });
    // Start the keeper
    await rebalancer.start();
    // Handle graceful shutdown
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
    console.error('Stack trace:', error.stack);
    process.exit(1);
});
