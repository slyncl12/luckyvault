import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Check if it's actually the lending market object, not package
  const obj = await client.getObject({
    id: '0xa02a98f9c88db51c6f5efaaf2261c81f34dd56d86073387e0ef1805ca22e39c8',
    options: { showType: true, showOwner: true }
  });
  
  console.log('Object type:', obj.data?.type);
  console.log('Owner:', JSON.stringify(obj.data?.owner, null, 2));
  
  // The correct Suilend package is probably different
  console.log('\n🔍 Check Suilend docs at: https://docs.suilend.fi/');
  console.log('Or look at existing Suilend transactions on Suiscan');
  
  process.exit(0);
})();
