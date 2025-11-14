import { useState } from 'react'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

const PACKAGE_ID = '0x92cb53d6272d4887b44cc2355bb4be78a08bad84a5ff7e2c9fe0f53afb52c521'
const CLOCK_ID = '0x6'

export function CreateLuckButton({ account, onSuccess }) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const handleCreateLuck = async () => {
    setLoading(true)
    setStatus('Creating your luck object...')

    try {
      const tx = new Transaction()

tx.moveCall({
  target: `${PACKAGE_ID}::lottery_personal::create_my_luck`,
  arguments: [tx.object(CLOCK_ID)]
})

       
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            console.log('Luck object created:', result)
            setStatus('✅ Luck object created! Starting at level 1')
            setTimeout(() => {
              setLoading(false)
              setStatus('')
              if (onSuccess) onSuccess()
            }, 3000)
          },
          onError: (error) => {
            console.error('Create luck failed:', error)
            setStatus('❌ Failed: ' + error.message)
            setLoading(false)
          }
        }
      )
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      marginBottom: '30px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🍀</div>
      
      <h2 style={{ 
        marginTop: 0, 
        color: '#333', 
        fontSize: '32px', 
        marginBottom: '16px' 
      }}>
        Activate Your Luck!
      </h2>
      
      <p style={{ 
        color: '#666', 
        fontSize: '18px', 
        marginBottom: '30px',
        lineHeight: '1.6'
      }}>
        Create your Luck Object to multiply your lottery entries!<br/>
        Start at 1x and grow to 10x over time.
      </p>

      <button
        onClick={handleCreateLuck}
        disabled={loading}
        style={{
          padding: '20px 48px',
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'white',
          background: loading 
            ? '#9ca3af' 
            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'transform 0.2s',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
        }}
        onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
      >
        {loading ? '⏳ Creating...' : '✨ Create Luck Object'}
      </button>

      {status && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: status.includes('❌') ? '#fee2e2' : '#d1fae5',
          color: status.includes('❌') ? '#991b1b' : '#065f46',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          {status}
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f3f4f6',
        borderRadius: '12px',
        textAlign: 'left'
      }}>
        <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '12px', fontSize: '16px' }}>
          📊 How Luck Works:
        </div>
        <ul style={{ 
          margin: '0', 
          paddingLeft: '20px', 
          color: '#666',
          fontSize: '14px',
          lineHeight: '1.8'
        }}>
          <li><strong>Start at Level 1</strong> - Each ticket = 1 entry</li>
          <li><strong>Grows Weekly</strong> - Increases by 1 level per week (max 10)</li>
          <li><strong>Multiplies Entries</strong> - Level 5 luck = 5x entries per ticket</li>
          <li><strong>Resets on Withdraw</strong> - Withdrawing any ticket resets to level 1</li>
          <li><strong>Higher Odds</strong> - More entries = better chance to win!</li>
        </ul>
      </div>
    </div>
  )
}
