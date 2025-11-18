import { useEffect, useState } from 'react'
import { SuiClient } from '@mysten/sui/client'

const client = new SuiClient({ url: import.meta.env.VITE_SUI_RPC_URL })

export function LuckMeter({ userAddress, onLuckLoaded }) {
  const [luck, setLuck] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLuck() {
      // If no wallet connected, show demo luck value
      if (!userAddress) {
        const demoLuck = 42 // Demo value for marketing
        setLuck(demoLuck)
        setLoading(false)
        if (onLuckLoaded) onLuckLoaded(demoLuck)
        return
      }

      try {
        const poolData = await client.getObject({
          id: import.meta.env.VITE_POOL_OBJECT_ID,
          options: { showContent: true }
        })

        if (poolData.data?.content?.fields) {
          const userLuck = poolData.data.content.fields.user_luck?.[userAddress] || 0
          setLuck(userLuck)
          if (onLuckLoaded) onLuckLoaded(userLuck)
        }
      } catch (error) {
        console.error('Error fetching luck:', error)
        setLuck(0)
      } finally {
        setLoading(false)
      }
    }

    fetchLuck()
  }, [userAddress, onLuckLoaded])

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(76, 209, 55, 0.1) 0%, rgba(45, 52, 54, 0.3) 100%)',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid rgba(76, 209, 55, 0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ textAlign: 'center', color: '#7f8fa6' }}>Loading...</div>
      </div>
    )
  }

  const luckPercentage = Math.min((luck / 100) * 100, 100)
  const isDemo = !userAddress

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(76, 209, 55, 0.1) 0%, rgba(45, 52, 54, 0.3) 100%)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(76, 209, 55, 0.2)',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background shimmer */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '200%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(76, 209, 55, 0.1), transparent)',
        animation: 'shimmer 3s infinite',
        pointerEvents: 'none'
      }} />

      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(0); }
            100% { transform: translateX(50%); }
          }
        `}
      </style>

      <h3 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #4cd137 0%, #44bd32 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        🍀 Your Luck Meter
        {isDemo && (
          <span style={{
            fontSize: '12px',
            background: 'rgba(255, 193, 7, 0.2)',
            color: '#ffc107',
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: 'normal'
          }}>
            Demo
          </span>
        )}
      </h3>

      {/* Luck Bar */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '16px',
        height: '48px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '16px',
        border: '1px solid rgba(76, 209, 55, 0.1)'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${luckPercentage}%`,
          background: 'linear-gradient(90deg, #4cd137 0%, #44bd32 50%, #4cd137 100%)',
          transition: 'width 1s ease-out',
          borderRadius: '16px',
          boxShadow: '0 0 20px rgba(76, 209, 55, 0.5)'
        }} />
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '20px',
          zIndex: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {luck} Luck Points
        </div>
      </div>

      {/* Luck Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        fontSize: '14px'
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(76, 209, 55, 0.1)'
        }}>
          <div style={{ color: '#7f8fa6', marginBottom: '4px' }}>Luck Level</div>
          <div style={{ color: '#4cd137', fontWeight: 'bold', fontSize: '16px' }}>
            {luck < 25 ? '🌱 Sprouting' :
             luck < 50 ? '🍀 Lucky' :
             luck < 75 ? '⭐ Very Lucky' :
             '🌟 Legendary'}
          </div>
        </div>
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(76, 209, 55, 0.1)'
        }}>
          <div style={{ color: '#7f8fa6', marginBottom: '4px' }}>Win Boost</div>
          <div style={{ color: '#4cd137', fontWeight: 'bold', fontSize: '16px' }}>
            +{luck}%
          </div>
        </div>
      </div>

      {isDemo && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#ffc107',
          textAlign: 'center'
        }}>
          💡 Connect your wallet to see your real luck!
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(76, 209, 55, 0.05)',
        borderRadius: '12px',
        fontSize: '13px',
        color: '#7f8fa6',
        lineHeight: '1.5'
      }}>
        💎 Earn luck by depositing and holding USDC. Higher luck = better chances to win!
      </div>
    </div>
  )
}
