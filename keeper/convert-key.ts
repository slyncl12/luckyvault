import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const suiPrivKey = 'suiprivkey1qr4j34gw2yq79x7p9f8mlqstrmwy2tcerqhpq97q65r3kltf5zvy6d7gpnx';
const { secretKey } = decodeSuiPrivateKey(suiPrivKey);
const base64Key = Buffer.from(secretKey).toString('base64');

console.log('New Admin Secret Key (base64):');
console.log(base64Key);
