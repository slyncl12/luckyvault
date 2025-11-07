import { useState, useEffect } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'

const PACKAGE_ID = '0x4948b7ee9d6c6f0044eb3eea4b8dec2de3b9f07cab683940be3fd3d9557b46b0'

export function LuckMeter({ userAddress, onLuckLoaded }) {
  const client = useSuiClient()
  const [luckData, setLuckData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userAddress) {
      setLoading(false)
      return
    }

    fetchLuckObject()
    const interval = setInterval(fetchLuckObject, 30000)
    return () => clearInterval(interval)
  }, [userAddress])

  const fetchLuckObject = async () => {
    if (!userAddress) return

    try {
      const objects = await client.getOwnedObjects({
        owner: userAddress,
        filter: {
        StructType: `${PACKAGE_ID}::lottery_personal::PlayerLuck`
        },
        options: { showContent: true }
      })

      if (objects.data && objects.data.length > 0 && objects.data[0].data) {
        const fields = objects.data[0].data.content.fields
        
const luck = {
  objectId: objects.data[0].data.objectId,
  level: Math.min(10, Math.floor(parseInt(fields.regular_luck_bps || '10000') / 10000)),
  lastUpdate: fields.last_regular_draw || '0'
}
        setLuckData(luck)
        if (onLuckLoaded) onLuckLoaded(luck)
      } else {
        setLuckData(null)
        if (onLuckLoaded) onLuckLoaded(null)
      }
    } catch (error) {
      console.error('Error fetching luck object:', error)
      setLuckData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading luck data...</div>
      </div>
    )
  }

  if (!luckData) {
    return null
  }

  const multiplier = luckData.level
  const percentage = (luckData.level / 10) * 100

  const getLuckColor = (level) => {
    if (level <= 3) return { from: '#ef4444', to: '#dc2626' }
    if (level <= 5) return { from: '#f59e0b', to: '#d97706' }
    if (level <= 7) return { from: '#10b981', to: '#059669' }
    return { from: '#8b5cf6', to: '#7c3aed' }
  }

  const colors = getLuckColor(luckData.level)

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      marginBottom: '30px'
    }}>
      <h2 style={{ 
        marginTop: 0, 
        color: '#333', 
        fontSize: '28px', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '36px' }}>🍀</span>
        Your Luck Meter
      </h2>

      <div style={{
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
        borderRadius: '16px',
        padding: '32px',
        color: 'white',
        marginBottom: '20px',
        boxShadow: `0 8px 24px ${colors.from}40`
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
              Luck Level
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
              {luckData.level}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
              Multiplier
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
              {multiplier}x
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '12px',
          height: '24px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            height: '100%',
            width: `${percentage}%`,
            borderRadius: '12px',
            transition: 'width 0.5s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: colors.from
          }}>
            {percentage}%
          </div>
        </div>
      </div>

      <div style={{
        background: '#f3f4f6',
        borderRadius: '12px',
        padding: '20px',
        fontSize: '14px',
        color: '#666',
        lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
          📈 How Luck Works:
        </div>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Each ticket gets <strong>{multiplier}x entries</strong> in the lottery</li>
          <li>Luck increases by 1 per week (max 10)</li>
          <li>Withdrawing a ticket resets luck to 1</li>
          <li>Higher luck = Better odds of winning!</li>
        </ul>
      </div>
    </div>
  )
}
