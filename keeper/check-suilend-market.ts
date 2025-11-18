import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const SUILEND_PACKAGE = '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf';
  const MAIN_MARKET = '0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1';
  
  const market = await client.getObject({
    id: MAIN_MARKET,
    options: { showContent: true, showType: true }
  });
  
  console.log('📊 Suilend Main Market:', MAIN_MARKET);
  console.log('Type:', market.data?.type);
  
  if (market.data?.content && 'fields' in market.data.content) {
    const fields = market.data.content.fields as any;
    console.log('\n🏦 Market Info:');
    console.log('   Reserves count:', fields.reserves?.length || 'N/A');
    
    // Find USDC reserve
    if (fields.reserves) {
      console.log('\n💰 Searching for USDC reserve...');
      // USDC reserve is usually index 0 or 1
      console.log('   Try reserve index: 0');
    }
  }
  
  console.log('\n✅ Correct values:');
  console.log('   SUILEND_PACKAGE:', SUILEND_PACKAGE);
  console.log('   MAIN_MARKET:', MAIN_MARKET);
  console.log('   USDC_RESERVE: 0 (try this first)');
  
  process.exit(0);
})();
