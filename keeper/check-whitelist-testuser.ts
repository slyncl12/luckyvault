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
  
  const testUser = '0x041c09a3cde2713f5ea4e8b152c50f0516d2b22a51c15b73d39403eab00bbc84';
  const isWhitelisted = whitelist.includes(testUser);
  
  console.log(`\n${isWhitelisted ? '✅' : '❌'} Test User (${testUser}) is ${isWhitelisted ? 'whitelisted' : 'NOT whitelisted'}`);
  
  process.exit(0);
})();
