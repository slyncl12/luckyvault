import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Check the old ticket structure
  const oldTickets = await client.getOwnedObjects({
    owner: '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4',
    filter: {
      StructType: '0x8710a72d6066dcb031a72369d545b430fdb47d26e1987ba87628c778c9adfe07::lottery_personal::Ticket'
    },
    options: { showContent: true }
  });
  
  console.log('🎫 Old Tickets:', oldTickets.data.length);
  
  if (oldTickets.data[0]) {
    const fields = (oldTickets.data[0].data?.content as any)?.fields;
    console.log('\nOld ticket fields:');
    console.log('  pool_id:', fields?.pool_id || 'MISSING!');
    console.log('  amount:', fields?.amount);
  }
  
  process.exit(0);
})();
