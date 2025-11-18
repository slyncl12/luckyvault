import { naviService } from './NaviService';

async function check() {
  await naviService.initialize();
  const position = await naviService.getUserPosition('0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382');
  console.log('NAVI Position:', position);
}

check().catch(console.error);
