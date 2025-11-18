/**
 * NAVI API for Frontend
 * Fetches real-time APY from NAVI Protocol
 */

import { getPools } from '@naviprotocol/lending';

/**
 * Get real-time USDC supply APY from NAVI
 */
export async function getNaviAPY(): Promise<number> {
  try {
    const pools = await getPools({
      env: 'prod',
      cacheTime: 60000 // Cache for 1 minute
    });

    // Find USDC pool
    const usdcPool = pools.find(pool => 
      pool.token?.symbol === 'USDC'
    );

    if (!usdcPool) {
      console.error('USDC pool not found in NAVI');
      return 0;
    }

    // Get total APY (includes boost)
    const apy = parseFloat(usdcPool.supplyIncentiveApyInfo?.apy || '0');
    
    console.log(`✅ NAVI APY: ${apy.toFixed(2)}%`);
    return apy;

  } catch (error) {
    console.error('Error fetching NAVI APY:', error);
    return 0;
  }
}

/**
 * Get detailed APY breakdown
 */
export async function getNaviAPYBreakdown() {
  try {
    const pools = await getPools({ env: 'prod' });
    const usdcPool = pools.find(p => p.token?.symbol === 'USDC');

    if (!usdcPool) {
      return null;
    }

    const vaultApr = parseFloat(usdcPool.supplyIncentiveApyInfo?.vaultApr || '0');
    const boostedApr = parseFloat(usdcPool.supplyIncentiveApyInfo?.boostedApr || '0');
    const totalApy = parseFloat(usdcPool.supplyIncentiveApyInfo?.apy || '0');

    return {
      baseAPR: vaultApr,      // Stable lending APR (7.69%)
      boostedAPR: boostedApr, // CERT token rewards (0.97%)
      totalAPY: totalApy,     // Total APY (8.66%)
      utilizationRate: parseFloat(usdcPool.totalBorrow || '0') / parseFloat(usdcPool.totalSupply || '1')
    };

  } catch (error) {
    console.error('Error fetching APY breakdown:', error);
    return null;
  }
}
