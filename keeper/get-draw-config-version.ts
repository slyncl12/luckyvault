import { SuiClient } from '@mysten/sui/client';

(async () => {
  const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
  
  const obj = await client.getObject({
    id: '0xc4fe338a6ead5f9321ad129011c1c3a5ab0fd1656558df058b87ec2a611fb64d',
    options: { showContent: true, showOwner: true }
  });
  
  console.log('DrawConfig Info:');
  console.log('  Version:', obj.data?.version);
  console.log('  Owner:', JSON.stringify(obj.data?.owner, null, 2));
  
  if ((obj.data?.owner as any)?.Shared) {
    console.log('\n✅ Shared object!');
    console.log('  Initial version:', (obj.data?.owner as any).Shared.initial_shared_version);
  }
  
  process.exit(0);
})();
