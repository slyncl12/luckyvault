import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Search for Suilend USDC lending
  console.log('🔍 Searching for Suilend...\n');
  
  // Known Suilend info from their docs
  const POTENTIAL_SUILEND_PACKAGES = [
    '0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf',
    '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf',
  ];
  
  for (const pkg of POTENTIAL_SUILEND_PACKAGES) {
    try {
      const obj = await client.getObject({
        id: pkg,
        options: { showType: true }
      });
      console.log(`Package ${pkg}:`, obj.data ? '✅ EXISTS' : '❌ Not found');
    } catch (e) {
      console.log(`Package ${pkg}: ❌ Not found`);
    }
  }
  
  console.log('\n💡 Check: https://app.suilend.fi/');
  console.log('Or search "suilend usdc" on https://suiscan.xyz/mainnet/home');
  
  process.exit(0);
})();
