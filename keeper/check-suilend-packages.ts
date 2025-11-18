import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const packages = [
    '0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf',
    '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf',
  ];
  
  for (const pkg of packages) {
    console.log(`\n📦 Package: ${pkg}`);
    
    try {
      const normalized = await client.getNormalizedMoveModulesByPackage({
        package: pkg
      });
      
      const modules = Object.keys(normalized);
      console.log(`   Modules: ${modules.join(', ')}`);
      
      // Check if it has lending_market module
      if (modules.includes('lending_market')) {
        console.log('   ✅ Has lending_market module - THIS IS SUILEND!');
      }
    } catch (e: any) {
      console.log('   ❌ Error:', e.message);
    }
  }
  
  process.exit(0);
})();
