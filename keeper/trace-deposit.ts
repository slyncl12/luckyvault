import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

async function traceDeposit() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Check the DepositEvent we saw earlier - transaction where $2 was deposited
  const tx = await client.getTransactionBlock({
    digest: 'BxBwRy3GERb8hYztjVqjG5cMrYNgZXcdxanXs8tdehXq', // From your DepositEvent earlier
    options: {
      showEffects: true,
      showObjectChanges: true,
      showBalanceChanges: true
    }
  });
  
  console.log('Transaction Details:');
  console.log(JSON.stringify(tx, null, 2));
}

traceDeposit().catch(console.error);
