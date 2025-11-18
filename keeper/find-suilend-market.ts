import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const SUILEND_PACKAGE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf';
  
  // Search for LendingMarket objects
  console.log('🔍 Searching for Suilend lending markets...\n');
  
  const markets = await client.getOwnedObjects({
    owner: '0x0',  // Shared objects
    filter: {
      StructType: `${SUILEND_PACKAGE}::lending_market::LendingMarket`
    },
    options: { showContent: true, showType: true }
  });
  
  console.log(`Found ${markets.data.length} markets`);
  
  // The main market is usually a shared object
  // Let's check a known Suilend market ID from their app
  const KNOWN_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1';
  
  try {
    const market = await client.getObject({
      id: KNOWN_MARKET,
      options: { showContent: true, showType: true }
    });
    
    console.log('\n📊 Main Suilend Market:');
    console.log('   ID:', KNOWN_MARKET);
    console.log('   Type:', market.data?.type);
    
    if (market.data?.content && 'fields' in market.data.content) {
      const fields = market.data.content.fields as any;
      console.log('   Reserves:', fields.reserves?.length || 'Unknown');
    }
    
    console.log('\n✅ Use this market ID:', KNOWN_MARKET);
  } catch (e: any) {
    console.log('❌ Error:', e.message);
  }
  
  process.exit(0);
})();
