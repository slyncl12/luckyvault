import { naviService } from './NaviService';

async function test() {
  console.log('🧪 Testing NAVI Service...\n');
  
  await naviService.initialize();
  
  const apy = await naviService.getUSDCSupplyAPY();
  console.log(`\n📊 Current APY: ${apy.toFixed(2)}%`);
  
  const stats = await naviService.getUSDCPoolStats();
  console.log('\n📈 Pool Stats:');
  console.log(`   Supply APY: ${stats.supplyAPY.toFixed(2)}%`);
  console.log(`   Borrow APY: ${stats.borrowAPY.toFixed(2)}%`);
  console.log(`   Utilization: ${(stats.utilizationRate * 100).toFixed(2)}%`);
  
  // Test earnings calculation
  const balance = 10000_000000n; // 10,000 USDC
  const daily = naviService.calculateDailyEarnings(balance, apy);
  console.log(`\n💰 Earnings for 10,000 USDC:`);
  console.log(`   Daily: $${naviService.formatUSDC(daily)}`);
  console.log(`   Monthly: $${naviService.formatUSDC(daily * 30n)}`);
}

test().catch(console.error);
