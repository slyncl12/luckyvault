import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const suiprivkey = 'suiprivkey1qzfqzhe0zz6h222xr00f4w7hq9tu5df349fsskv46lyxk5kvf6nd2pqhlhs';

try {
  const { secretKey } = decodeSuiPrivateKey(suiprivkey);
  const hexKey = Buffer.from(secretKey).toString('hex');
  console.log('\n✅ Your hex private key:');
  console.log(hexKey);
  console.log('\nCopy this and paste it into your .env file as VITE_ADMIN_SECRET_KEY');
} catch (error) {
  console.error('Error:', error);
}
