import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Check pool
  const pool = await client.getObject({
    id: '0xc7d45a940c061bde2865979f9bb61a8b0f0d643582093be7c55ee7a87ec6d86f',
    options: { showContent: true }
  });
  
  const poolFields = (pool.data?.content as any)?.fields;
  const poolBalance = parseInt(poolFields?.balance || '0');
  
  // Check admin USDC
  const adminCoins = await client.getCoins({
    owner: '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382',
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
  });
  
  const adminBalance = adminCoins.data.reduce((sum, c) => sum + parseInt(c.balance), 0);
  
  console.log('💰 Current State:');
  console.log('   Pool balance:', (poolBalance / 1_000_000).toFixed(6), 'USDC');
  console.log('   Admin wallet:', (adminBalance / 1_000_000).toFixed(6), 'USDC');
  console.log('   Total:', ((poolBalance + adminBalance) / 1_000_000).toFixed(6), 'USDC');
  
  if (adminBalance > 0) {
    console.log('\n⚠️  Admin has USDC that should be in Suilend!');
    console.log('   Keeper should deposit it on next cycle (every 15s)');
  }
  
  process.exit(0);
})();
