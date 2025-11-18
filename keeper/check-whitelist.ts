import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const pool = await client.getObject({
    id: '0xc7d45a940c061bde2865979f9bb61a8b0f0d643582093be7c55ee7a87ec6d86f',
    options: { showContent: true }
  });
  
  const fields = (pool.data?.content as any)?.fields;
  const whitelist = fields?.whitelist?.fields?.contents || [];
  
  console.log('🔍 Whitelisted addresses:');
  whitelist.forEach((addr: string, i: number) => {
    console.log(`   ${i + 1}. ${addr}`);
  });
  
  const yourWallet = '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4';
  const isWhitelisted = whitelist.includes(yourWallet);
  
  console.log(`\n${isWhitelisted ? '✅' : '❌'} Your wallet (${yourWallet}) is ${isWhitelisted ? 'whitelisted' : 'NOT whitelisted'}`);
  
  process.exit(0);
})();
