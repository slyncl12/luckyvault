/**
 * Suilend Stats Component - Simplified Version
 * Shows current USDC supply APY from Suilend
 */

import { useState, useEffect } from 'react';
import { suilendService } from '../services/SuilendService';

interface SuilendStatsProps {
  userAddress?: string;
  refreshInterval?: number;
}

export function SuilendStats({ refreshInterval = 30000 }: SuilendStatsProps) {
  const [stats, setStats] = useState({
    supplyAPY: 0,
    borrowAPY: 0,
    totalDeposits: '0',
    totalBorrows: '0',
    utilizationRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const reserveStats = await suilendService.getUSDCReserveStats();
      setStats(reserveStats);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Suilend data:', err);
      setError('Failed to fetch Suilend data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px' }}>⏳ Loading Suilend data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', color: '#ef4444' }}>⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
    }}>
      <h2 style={{ 
        marginTop: 0, 
        color: '#333', 
        fontSize: '32px', 
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span>📈</span> Suilend Yield
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px'
      }}>
        {/* Supply APY */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.9, 
            marginBottom: '8px', 
            fontWeight: '600' 
          }}>
            💰 Supply APY
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {stats.supplyAPY.toFixed(2)}%
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.8, 
            marginTop: '8px' 
          }}>
            Earn on deposits
          </div>
        </div>

        {/* Borrow APY */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.9, 
            marginBottom: '8px', 
            fontWeight: '600' 
          }}>
            📊 Borrow APY
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {stats.borrowAPY.toFixed(2)}%
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.8, 
            marginTop: '8px' 
          }}>
            Cost to borrow
          </div>
        </div>

        {/* Utilization */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.9, 
            marginBottom: '8px', 
            fontWeight: '600' 
          }}>
            📈 Utilization
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {stats.utilizationRate.toFixed(1)}%
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.8, 
            marginTop: '8px' 
          }}>
            Pool usage
          </div>
        </div>

        {/* Total Supplied */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)'
        }}>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.9, 
            marginBottom: '8px', 
            fontWeight: '600' 
          }}>
            💎 Total Supplied
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            ${suilendService.formatUSDC(stats.totalDeposits)}
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.8, 
            marginTop: '8px' 
          }}>
            USDC in pool
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f3f4f6',
        borderRadius: '12px',
        fontSize: '14px',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          💡 <strong>Your USDC earns {stats.supplyAPY.toFixed(2)}% APY</strong> when deposited in LuckyVault
        </span>
        <span style={{ 
          fontSize: '12px', 
          opacity: 0.7,
          fontStyle: 'italic' 
        }}>
          Updates every 30s
        </span>
      </div>
    </div>
  );
}
