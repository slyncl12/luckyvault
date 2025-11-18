import { SuilendClient } from '@suilend/sdk';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

(async () => {
  console.log('🔍 Fetching USDC reserve data from Suilend...\n');
  
  const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const client = new SuilendClient(suiClient);
  
  // Get reserves (lending pools)
  const reserves = await client.getReserves();
  
  // Find USDC reserve
  const usdcReserve = reserves.find(r => 
    r.coinType.includes('usdc') || r.coinType.includes('USDC')
  );
  
  if (usdcReserve) {
    console.log('📊 USDC Reserve Data:');
    console.log('   Coin Type:', usdcReserve.coinType);
    console.log('   Supply APR:', (parseFloat(usdcReserve.apr) * 100).toFixed(2) + '%');
    console.log('   Supply APY:', (parseFloat(usdcReserve.apy) * 100).toFixed(2) + '%');
    console.log('   Total Supply:', usdcReserve.depositedAmount);
    console.log('   Total Borrowed:', usdcReserve.borrowedAmount);
    console.log('\n   Raw Reserve Object:', JSON.stringify(usdcReserve, null, 2));
  } else {
    console.log('❌ USDC reserve not found');
  }
  
  process.exit(0);
})();
