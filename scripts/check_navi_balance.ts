import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

async function checkNaviBalance() {
    const walletAddress = '0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382';
    
    console.log('Checking NAVI position for:', walletAddress);
    
    const objects = await client.getOwnedObjects({
        owner: walletAddress,
        options: {
            showType: true,
            showContent: true,
        },
    });
    
    console.log('\nSearching for NAVI storage objects...\n');
    
    for (const obj of objects.data) {
        const type = obj.data?.type;
        if (type && type.includes('0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca::storage::Storage')) {
            console.log('✅ NAVI Storage Object Found!');
            console.log('Object ID:', obj.data?.objectId);
            console.log('Type:', type);
            console.log('Content:', JSON.stringify(obj.data?.content, null, 2));
        }
    }
}

checkNaviBalance().catch(console.error);
