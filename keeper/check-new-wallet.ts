import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });
  
  const NEW_ADDRESS = '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382';
  
  const coins = await client.getCoins({
    owner: NEW_ADDRESS,
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  });
  
  const balance = coins.data.reduce((sum, c) => sum + parseInt(c.balance), 0);
  
  console.log('💰 New Admin Wallet:');
  console.log('   Address:', NEW_ADDRESS);
  console.log('   USDC:', (balance / 1_000_000).toFixed(2));
  
  process.exit(0);
})();
