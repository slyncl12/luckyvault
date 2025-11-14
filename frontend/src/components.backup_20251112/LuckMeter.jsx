import { useState, useEffect } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'

const PACKAGE_ID = '0x92cb53d6272d4887b44cc2355bb4be78a08bad84a5ff7e2c9fe0f53afb52c521'

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
        background: 'rgba(26, 31, 58, 0.5)',
        border: '1px solid rgba(76, 209, 55, 0.2)',
        borderRadius: '24px',
        padding: '30px',
        backdropFilter: 'blur(10px)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '18px', color: '#7f8fa6' }}>Loading luck data...</div>
      </div>
    )
  }

  if (!luckData) {
    return null
  }

  const multiplier = luckData.level
  const percentage = (luckData.level / 10) * 100

  const getLuckColor = (level) => {
    if (level <= 3) return { from: '#4cd137', to: '#44bd32', glow: 'rgba(76, 209, 55, 0.3)' }
    if (level <= 6) return { from: '#00d2ff', to: '#3a7bd5', glow: 'rgba(0, 210, 255, 0.3)' }
    if (level <= 8) return { from: '#667eea', to: '#764ba2', glow: 'rgba(102, 126, 234, 0.3)' }
    return { from: '#f093fb', to: '#f5576c', glow: 'rgba(240, 147, 251, 0.3)' }
  }

  const colors = getLuckColor(luckData.level)

  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.5)',
      border: '1px solid rgba(76, 209, 55, 0.2)',
      borderRadius: '24px',
      padding: '30px',
      marginBottom: '20px',
      backdropFilter: 'blur(10px)'
    }}>
      <h3 style={{
        marginTop: 0,
        color: '#fff',
        fontSize: '18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        🍀 Your Luck Meter
      </h3>

      <div style={{
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '15px',
        boxShadow: `0 8px 24px ${colors.glow}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
              Luck Level
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>
              {luckData.level}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
              Multiplier
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>
              {multiplier}x
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          height: '20px',
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
            fontSize: '11px',
            fontWeight: 'bold',
            color: colors.from
          }}>
            {percentage > 15 && `${percentage}%`}
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(76, 209, 55, 0.2)',
        borderRadius: '12px',
        padding: '15px',
        fontSize: '13px',
        color: '#7f8fa6',
        lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: 'bold', color: '#4cd137', marginBottom: '8px' }}>
          📈 How Luck Works:
        </div>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#e0e6ed' }}>
          <li>Each ticket gets <strong style={{ color: '#4cd137' }}>{multiplier}x entries</strong> in the lottery</li>
          <li>Luck increases by 1 per week (max 10)</li>
          <li>Withdrawing a ticket resets luck to 1</li>
          <li>Higher luck = Better odds of winning!</li>
        </ul>
      </div>
    </div>
  )
}
