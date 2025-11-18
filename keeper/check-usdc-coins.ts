import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const coins = await client.getCoins({
    owner: '0x041c09a3cde2713f5ea4e8b152c50f0516d2b22a51c15b73d39403eab00bbc84',
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
  });
  
  console.log('💰 USDC Coins:');
  coins.data.forEach((coin, i) => {
    console.log(`   ${i + 1}. $${(parseInt(coin.balance) / 1_000_000).toFixed(6)} (${coin.coinObjectId.slice(0, 10)}...)`);
  });
  
  const total = coins.data.reduce((sum, c) => sum + parseInt(c.balance), 0);
  const largest = Math.max(...coins.data.map(c => parseInt(c.balance)));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total: $${(total / 1_000_000).toFixed(6)}`);
  console.log(`   Largest coin: $${(largest / 1_000_000).toFixed(6)}`);
  console.log(`   Can deposit $1? ${largest >= 1_000_000 ? '✅ YES' : '❌ NO - largest coin too small'}`);
  
  process.exit(0);
})();
