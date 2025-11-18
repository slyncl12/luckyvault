import { SuilendClient } from '@suilend/sdk';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

(async () => {
  console.log('🔍 Exploring Suilend SDK methods...\n');
  
  const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const client = new SuilendClient(suiClient);
  
  console.log('Available methods on SuilendClient:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
  
  console.log('\n📊 Fetching lending market data...\n');
  
  // Try to get the lending market
  const lendingMarket = await client.getLendingMarket();
  
  console.log('Lending Market object keys:', Object.keys(lendingMarket));
  
  // Find USDC reserve
  const reserves = lendingMarket.reserves;
  console.log('\nNumber of reserves:', reserves.length);
  
  const usdcReserve = reserves.find((r: any) => 
    r.coinType?.includes('usdc') || r.coinType?.includes('USDC')
  );
  
  if (usdcReserve) {
    console.log('\n✅ USDC Reserve found!');
    console.log('Available fields:', Object.keys(usdcReserve));
    console.log('\nReserve data:');
    console.log('   coinType:', usdcReserve.coinType);
    console.log('   supplyApr:', usdcReserve.supplyApr);
    console.log('   supplyApy:', usdcReserve.supplyApy);
    console.log('   borrowApr:', usdcReserve.borrowApr);
    console.log('   borrowApy:', usdcReserve.borrowApy);
    
    console.log('\n📈 Supply Interest Rate:');
    console.log('   APR:', (Number(usdcReserve.supplyApr) * 100).toFixed(2) + '%');
    console.log('   APY:', (Number(usdcReserve.supplyApy) * 100).toFixed(2) + '%');
  }
  
  process.exit(0);
})();
