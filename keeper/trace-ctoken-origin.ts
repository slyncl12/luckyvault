import { SuiClient } from '@mysten/sui/client';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log('🔍 Tracing CToken origin...\n');
  
  const client = new SuiClient({ url: process.env.VITE_SUI_RPC_URL });
  
  // Check one of the CToken coins
  const cTokenId = '0x017a4dfa491e6da10efe966f6a975d382e4cf714395d60804d08ffa51e3ff408';
  
  const obj = await client.getObject({
    id: cTokenId,
    options: {
      showPreviousTransaction: true,
    },
  });
  
  console.log('📊 CToken Object:', cTokenId);
  console.log('Previous Transaction:', obj.data?.previousTransaction);
  
  if (obj.data?.previousTransaction) {
    const tx = await client.getTransactionBlock({
      digest: obj.data.previousTransaction,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
      },
    });
    
    console.log('\n📜 Transaction Details:');
    console.log('Sender:', tx.transaction?.data.sender);
    console.log('Transaction Kind:', tx.transaction?.data.transaction.kind);
    console.log('\nEvents:');
    tx.events?.forEach(e => {
      console.log('  -', e.type);
    });
  }
  
  console.log('\n💡 Understanding the issue:');
  console.log('   - CTokens are in your wallet');
  console.log('   - But NOT in a Suilend obligation');
  console.log('   - This means they were transferred, not deposited');
  console.log('\n🔧 Solution: Need to swap CTokens → USDC directly');
  
  process.exit(0);
})();
