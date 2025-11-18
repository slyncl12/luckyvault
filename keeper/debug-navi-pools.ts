import { getPools } from '@naviprotocol/lending';

async function debugPools() {
  const pools = await getPools();
  console.log('Total pools:', pools.length);
  console.log('\nFirst pool structure:');
  console.log(JSON.stringify(pools[0], null, 2));
  
  console.log('\nAll pool keys:');
  if (pools[0]) {
    console.log(Object.keys(pools[0]));
  }
}

debugPools().catch(console.error);
