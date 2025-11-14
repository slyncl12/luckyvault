/**
 * Admin Panel Component - Pause/Unpause Pool
 */

import { useState } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x4948b7ee9d6c6f0044eb3eea4b8dec2de3b9f07cab683940be3fd3d9557b46b0';
const POOL_ID = '0x687ddcb509474ba9c3c49c3fd995794c7f75dfb75c4c17ca2b2a53f5d4ec07fb';
const ADMIN_CAP_ID = '0xb342a551a36ce24b4631cdcbd83109880e80aca68a7855612a047347d5e13bac';
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

interface AdminPanelProps {
  isPaused: boolean;
  onSuccess: () => void;
}

export function AdminPanel({ isPaused, onSuccess }: AdminPanelProps) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleTogglePause = async () => {
    setLoading(true);
    setStatus(isPaused ? 'Unpausing pool...' : 'Pausing pool...');

    try {
      const tx = new Transaction();

    if (isPaused) {
        // Unpause
        tx.moveCall({
          target: `${PACKAGE_ID}::lottery_personal::unpause`,
          typeArguments: [USDC_TYPE],
          arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(POOL_ID),
            tx.object('0x6'), // Clock
          ],
        });
      } else {
        // Pause
        tx.moveCall({
          target: `${PACKAGE_ID}::lottery_personal::pause`,
          typeArguments: [USDC_TYPE],
          arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(POOL_ID),
            tx.object('0x6'), // Clock
          ],
        });
      }

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Success:', result);
            setStatus(isPaused ? '✅ Pool unpaused!' : '✅ Pool paused!');
            setLoading(false);
            setTimeout(() => {
              onSuccess();
            }, 1000);
          },
          onError: (error) => {
            console.error('Error:', error);
            setStatus('❌ Error: ' + error.message);
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Error:', error);
      setStatus('❌ Error: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '30px',
      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
      color: 'white'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
        🔑 Admin Controls
      </h3>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: status ? '16px' : '0'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
            Pool Status:
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {isPaused ? '⏸️ Paused' : '✅ Active'}
          </div>
        </div>

        <button
          onClick={handleTogglePause}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: loading ? '#9ca3af' : (isPaused ? '#10b981' : '#ef4444'),
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {loading ? '⏳ Processing...' : (isPaused ? '▶️ Unpause Pool' : '⏸️ Pause Pool')}
        </button>
      </div>

      {status && (
        <div style={{
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
