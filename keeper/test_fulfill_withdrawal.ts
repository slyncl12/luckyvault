import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { NaviService } from './NaviService';
import { WithdrawalFulfiller } from './WithdrawalFulfiller';
import dotenv from 'dotenv';

dotenv.config();

const client = new SuiClient({ url: 'https://sui-mainnet.nodeinfra.com' });
const { secretKey } = decodeSuiPrivateKey(process.env.VITE_ADMIN_SECRET_KEY!);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

async function test() {
  const naviService = new NaviService(client, keypair);
  await naviService.initialize();
  
  const fulfiller = new WithdrawalFulfiller(client, keypair, naviService);
  
  // Fulfill the withdrawal (amount will be determined from the request)
  await fulfiller.fulfillWithdrawal(
    '0xc90c9633cb9d333f5e57a35593f60074778dda96bcd2cae951672f38c08cd451',
    2000000 // $2
  );
}

test();
