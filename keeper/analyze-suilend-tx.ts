import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  console.log('🔍 Searching for recent Suilend deposits...\n');
  
  // Get recent transactions to the Suilend market
  const events = await client.queryEvents({
    query: {
      MoveEventModule: {
        package: '0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf',
        module: 'lending_market'
      }
    },
    limit: 5,
    order: 'descending'
  });
  
  if (events.data.length > 0) {
    const firstEvent = events.data[0];
    console.log('📊 Recent Suilend transaction:');
    console.log('   Digest:', firstEvent.id.txDigest);
    
    // Get full transaction
    const tx = await client.getTransactionBlock({
      digest: firstEvent.id.txDigest,
      options: {
        showInput: true,
        showRawInput: true
      }
    });
    
    console.log('\n📝 Transaction structure:');
    console.log(JSON.stringify(tx.transaction?.data.transaction, null, 2));
  } else {
    console.log('❌ No recent events found');
  }
  
  process.exit(0);
})();
