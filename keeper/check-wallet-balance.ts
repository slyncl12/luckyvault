import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const wallets = [
    { name: 'OLD Admin', addr: '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4' },
    { name: 'NEW Admin', addr: '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382' },
    { name: 'Test User', addr: '0x041c09a3cde2713f5ea4e8b152c50f0516d2b22a51c15b73d39403eab00bbc84' },
  ];
  
  for (const wallet of wallets) {
    const coins = await client.getCoins({
      owner: wallet.addr,
      coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    });
    
    const balance = coins.data.reduce((sum, c) => sum + parseInt(c.balance), 0);
    console.log(`💰 ${wallet.name}: $${(balance / 1_000_000).toFixed(2)} USDC`);
  }
  
  process.exit(0);
})();
