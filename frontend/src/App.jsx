import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { useState, useEffect } from 'react'
import { SuilendStats } from './components/SuilendStats'
import { AdminPanel } from './components/AdminPanel'
import { LuckMeter } from './components/LuckMeter'
import { CreateLuckButton } from './components/CreateLuckButton'

// ============ MAINNET ADDRESSES ============
const PACKAGE_ID = '0x4948b7ee9d6c6f0044eb3eea4b8dec2de3b9f07cab683940be3fd3d9557b46b0'
const POOL_ID = '0x687ddcb509474ba9c3c49c3fd995794c7f75dfb75c4c17ca2b2a53f5d4ec07fb'
const DRAW_CONFIG_ID = '0xcba4b530b23f2a3121cacb8db0a5ebd777d566f4f60445e5e29186c49f45bc61'
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
const CLOCK_ID = '0x6'

function App() {
  const client = useSuiClient()
  const account = useCurrentAccount()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const [poolData, setPoolData] = useState(null)
  const [userUSDC, setUserUSDC] = useState([])
  const [userSUI, setUserSUI] = useState('0')
  const [userTickets, setUserTickets] = useState([])
  const [userLuck, setUserLuck] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // Fetch pool data
  const fetchPoolData = async () => {
    try {
      const poolObject = await client.getObject({
        id: POOL_ID,
        options: { showContent: true }
      })

      if (poolObject.data?.content?.dataType === 'moveObject') {
        const fields = poolObject.data.content.fields
        setPoolData({
          balance: fields.balance || '0',
          totalDeposited: fields.total_deposited || '0',
          paused: fields.paused || false,
          whitelistSize: fields.whitelist?.fields?.contents?.length || 0
        })
      }
    } catch (error) {
      console.error('Error fetching pool:', error)
    }
  }

  const fetchUserSUI = async () => {
    if (!account) return
    try {
      const balance = await client.getBalance({
        owner: account.address,
        coinType: '0x2::sui::SUI'
      })
      setUserSUI(balance.totalBalance)
    } catch (error) {
      console.error('Error fetching SUI:', error)
    }
  }

  const fetchUserUSDC = async () => {
    if (!account) return
    try {
      const coins = await client.getCoins({
        owner: account.address,
        coinType: USDC_TYPE
      })
      setUserUSDC(coins.data)
    } catch (error) {
      console.error('Error fetching USDC:', error)
    }
  }

  const fetchUserTickets = async () => {
    if (!account) return
    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::lottery_personal::Ticket`
        },
        options: { showContent: true }
      })
      setUserTickets(objects.data.filter(obj => obj.data))
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

const fetchUserLuck = async () => {
  if (!account) return
  console.log('🔍 Fetching luck for:', account.address)  // ADD THIS
  try {
    const objects = await client.getOwnedObjects({
      owner: account.address,
      filter: {
        StructType: `${PACKAGE_ID}::lottery_personal::PlayerLuck`
      },
      options: { showContent: true }
    })
    
    console.log('📦 Luck objects found:', objects.data.length)  // ADD THIS
    
    if (objects.data && objects.data.length > 0 && objects.data[0].data) {
      const fields = objects.data[0].data.content.fields
      console.log('🍀 Luck fields:', fields)  // ADD THIS
      const luck = {
        objectId: objects.data[0].data.objectId,
        level: Math.min(10, Math.floor(parseInt(fields.regular_luck_bps || '10000') / 10000)),
        lastUpdate: fields.last_regular_draw || '0'
      }
      console.log('✅ Setting userLuck:', luck)  // ADD THIS
      setUserLuck(luck)
    } else {
      console.log('❌ No luck data found')  // ADD THIS
    }
  } catch (error) {
    console.error('Error fetching luck:', error)
  }
}
  useEffect(() => {
    fetchPoolData()
    const interval = setInterval(fetchPoolData, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (account) {
      fetchUserUSDC()
      fetchUserSUI()
      fetchUserTickets()
      fetchUserLuck()  // ADD THIS LINE
    }
  }, [account])

  const totalUSDC = userUSDC.reduce((sum, coin) => sum + parseInt(coin.balance), 0)
  const luckMultiplier = userLuck?.level || 1
  const totalTickets = userTickets.length
  const totalEffectiveEntries = totalTickets * luckMultiplier

  const handleDeposit = async () => {
    if (!account || !depositAmount || userUSDC.length === 0) return

    if (!userLuck) {
      setStatus('❌ Please create your Luck Object first!')
      return
    }

    setLoading(true)
    setStatus('Depositing to LuckyVault...')

    try {
      const tx = new Transaction()
      const amount = Math.floor(parseFloat(depositAmount) * 1_000_000)

      let usdcCoin = userUSDC.find(coin => parseInt(coin.balance) >= amount)

      if (!usdcCoin) {
        const [firstCoin, ...restCoins] = userUSDC
        if (restCoins.length > 0) {
          tx.mergeCoins(
            tx.object(firstCoin.coinObjectId),
            restCoins.map(coin => tx.object(coin.coinObjectId))
          )
        }
        usdcCoin = firstCoin
      }

      const [coin] = tx.splitCoins(tx.object(usdcCoin.coinObjectId), [amount])

tx.moveCall({
  target: `${PACKAGE_ID}::lottery_personal::deposit`,
  typeArguments: [USDC_TYPE],
  arguments: [
    tx.object(POOL_ID),
    tx.sharedObjectRef({
      objectId: DRAW_CONFIG_ID,
      initialSharedVersion: 672861041,
      mutable: false
    }),
    coin,
    tx.object(userLuck.objectId),
    tx.object(CLOCK_ID)
  ],
})
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            console.log('Deposit successful:', result)
            setStatus(`✅ Success! You got a ticket with ${luckMultiplier}x entries!`)
            setDepositAmount('')
            setTimeout(() => {
              fetchPoolData()
              fetchUserUSDC()
              fetchUserSUI()
              fetchUserTickets()
              setLoading(false)
            }, 2000)
          },
          onError: (error) => {
            console.error('Deposit failed:', error)
            setStatus('❌ Deposit failed: ' + error.message)
            setLoading(false)
          },
        }
      )
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error: ' + error.message)
      setLoading(false)
    }
  }

  const handleWithdraw = async (ticket) => {
    if (!account || !userLuck) return

    setLoading(true)
    setStatus('Withdrawing from LuckyVault...')

    try {
      const tx = new Transaction()

      const [withdrawnCoin] = tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::withdraw_with_luck`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(POOL_ID),
          tx.object(ticket.data.objectId),
          tx.object(userLuck.objectId),
          tx.object(CLOCK_ID)
        ],
      })

      tx.transferObjects([withdrawnCoin], account.address)

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            console.log('Withdraw successful:', result)
            setStatus('✅ Withdrawal successful! (Luck reset to level 1)')
            setTimeout(() => {
              fetchPoolData()
              fetchUserUSDC()
              fetchUserSUI()
              fetchUserTickets()
              setLoading(false)
            }, 2000)
          },
          onError: (error) => {
            console.error('Withdraw failed:', error)
            setStatus('❌ Withdraw failed: ' + error.message)
            setLoading(false)
          },
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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '56px',
            color: 'white',
            margin: '0 0 10px 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            fontWeight: 'bold'
          }}>
            🎰 LuckyVault
          </h1>
          <p style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.95)',
            margin: '0 0 20px 0',
            fontWeight: '500'
          }}>
            The No-Loss Lottery on Sui
          </p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <ConnectButton />
        </div>

        {/* Pause Status Banner */}
        {poolData?.paused && (
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏸️</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              Pool is Paused
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>
              Deposits disabled. Withdrawals still work!
            </div>
          </div>
        )}

        {account?.address === '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4' && (
          <AdminPanel isPaused={poolData?.paused || false} onSuccess={() => fetchPoolData()} />
        )}

        {account && (
          userLuck ? (
            <LuckMeter userAddress={account.address} onLuckLoaded={setUserLuck} />
          ) : (
         <CreateLuckButton account={account} onSuccess={() => setTimeout(() => window.location.reload(), 2000)} />          

            )
        )}

        {account && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333', fontSize: '28px', marginBottom: '20px' }}>💰 Your Balance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px',
                borderRadius: '16px',
                color: 'white'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>💎 SUI</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                  {(parseFloat(userSUI) / 1_000_000_000).toFixed(4)} SUI
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                padding: '20px',
                borderRadius: '16px',
                color: 'white'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>💵 USDC</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                  {(totalUSDC / 1_000_000).toFixed(6)} USDC
                </div>
              </div>
            </div>
            <div style={{
              fontSize: '16px',
              color: '#666',
              padding: '16px',
              background: '#f3f4f6',
              borderRadius: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🎫 Tickets</span>
                <span style={{ fontWeight: 'bold', color: '#667eea', fontSize: '20px' }}>{totalTickets}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🍀 Entries</span>
                <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '20px' }}>{totalEffectiveEntries}</span>
              </div>
            </div>
          </div>
        )}

        <SuilendStats userAddress={account?.address} refreshInterval={30000} />

        {account && totalUSDC > 0 && userLuck && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333', fontSize: '32px' }}>💰 Deposit USDC</h2>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '16px' }}>
              Each ticket gets <strong>{luckMultiplier}x entries</strong>!
            </p>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="number"
                step="0.000001"
                placeholder="Amount (USDC)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={handleDeposit}
              disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0 || poolData?.paused}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'white',
                background: (loading || poolData?.paused) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: (loading || poolData?.paused) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Processing...' : poolData?.paused ? '⏸️ Paused' : `🎲 Get ${luckMultiplier}x Entries`}
            </button>
          </div>
        )}

        {account && userTickets.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333', fontSize: '32px' }}>🎫 Your Tickets</h2>
            <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
              <strong>{totalEffectiveEntries} effective entries</strong> in the lottery!
            </p>
            <div style={{ display: 'grid', gap: '16px' }}>
              {userTickets.map((ticket, index) => {
                const amount = ticket.data?.content?.fields?.amount || '0'
                return (
                  <div key={ticket.data.objectId} style={{
                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    padding: '20px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '2px solid #10b981'
                  }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
                        💰 {(parseFloat(amount) / 1_000_000).toFixed(6)} USDC
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                        Ticket #{index + 1}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                        🍀 {luckMultiplier}x = {luckMultiplier} Entries
                      </div>
                    </div>
                    <button
                      onClick={() => handleWithdraw(ticket)}
                      disabled={loading}
                      style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: 'white',
                        background: loading ? '#9ca3af' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      💸 Withdraw
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {status && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '30px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '16px',
              background: status.includes('❌') ? '#fee2e2' : '#d1fae5',
              color: status.includes('❌') ? '#991b1b' : '#065f46',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              {status}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
