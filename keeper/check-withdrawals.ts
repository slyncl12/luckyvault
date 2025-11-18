import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkWithdrawals() {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  // Check pool events
  const events = await client.queryEvents({
    query: {
      MoveModule: {
        package: process.env.VITE_PACKAGE_ID!,
        module: 'lottery_personal'
      }
    },
    limit: 10,
    order: 'descending'
  });
  
  console.log('Recent events:');
  events.data.forEach(event => {
    console.log(event.type);
    console.log(event.parsedJson);
    console.log('---');
  });
}

checkWithdrawals().catch(console.error);
