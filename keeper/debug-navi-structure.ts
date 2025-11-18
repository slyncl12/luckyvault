import { getPools } from '@naviprotocol/lending';

async function debugPoolStructure() {
  console.log('🔍 Checking NAVI pool object structure...\n');
  
  try {
    const pools = await getPools({ 
      env: 'prod',
      cacheTime: 0
    });
    
    // Find USDC pool by coin type
    const usdcPool = pools.find(p => 
      p.coinType?.includes('dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7')
    );
    
    if (!usdcPool) {
      console.log('❌ USDC pool not found!');
      return;
    }
    
    console.log('✅ Found USDC pool!');
    console.log('\nFull pool object:');
    console.log(JSON.stringify(usdcPool, null, 2));
    
    console.log('\n\n=== Available properties ===');
    console.log('Keys:', Object.keys(usdcPool));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugPoolStructure();
