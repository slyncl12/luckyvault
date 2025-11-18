import { suilendService } from './SuilendService';

(async () => {
  console.log('🔍 Testing APY retrieval from Suilend...\n');
  
  await suilendService.initialize();
  
  try {
    const apy = await suilendService.getUSDCSupplyAPY();
    console.log('✅ APY Retrieved:', apy.toFixed(2) + '%');
  } catch (error) {
    console.error('❌ Failed to get APY:', error);
  }
  
  process.exit(0);
})();
