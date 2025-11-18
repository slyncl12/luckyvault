import { SuiClient } from '@mysten/sui/client';

(async () => {
  console.log('🔍 Fetching Suilend reserve object directly...\n');
  
  const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' });
  
  // Main pool reserve object for USDC
  const reserveId = '0xeb3903f7748ace73429bd52a70fff278aac1725d3b72c25e17b8214fe9cee78f';
  
  const reserve = await client.getObject({
    id: reserveId,
    options: {
      showContent: true,
      showType: true,
    },
  });
  
  console.log('📊 USDC Reserve Object:');
  console.log(JSON.stringify(reserve.data, null, 2));
  
  process.exit(0);
})();
