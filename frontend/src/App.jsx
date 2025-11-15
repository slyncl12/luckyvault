import { VERSION } from './version';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { useState, useEffect } from 'react'
import { LuckMeter } from './components/LuckMeter'
import { SuilendClient, LENDING_MARKET_ID, LENDING_MARKET_TYPE } from '@suilend/sdk'
import { DrawCountdowns } from './components/DrawCountdowns';

function App() {
  const client = useSuiClient()
  const account = useCurrentAccount()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  // ============ MAINNET ADDRESSES ============
  const PACKAGE_ID = '0x4d1c2bed675acbfaaf713a4c1b9f7945db47d295660b46e248dd097f4814a427' 
  const POOL_ID = '0xc7d45a940c061bde2865979f9bb61a8b0f0d643582093be7c55ee7a87ec6d86f'
  const DRAW_CONFIG_ID = '0xc4fe338a6ead5f9321ad129011c1c3a5ab0fd1656558df058b87ec2a611fb64d'
  const JACKPOT_TIERS_ID = '0xad2f4784050cd60cd1cdfdb7f6152aa9ff2e0827ffdb4f22c26d218e4fb34c3f'
  const SUILEND_TRACKER_ID = '0x0c12b86e1c9015da1b740cbf2a03318bfc9d7892c682320ef9f732d2bde6fd45'  
  const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
  const CLOCK_ID = '0x6'
  const RANDOM_ID = '0x8'
  const [suilendAPY, setSuilendAPY] = useState(7.26)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [poolData, setPoolData] = useState(null)
  const [userUSDC, setUserUSDC] = useState([])
  const [userSUI, setUserSUI] = useState([])
  const [userTickets, setUserTickets] = useState([])
  const [userLuck, setUserLuck] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const [jackpotBalances, setJackpotBalances] = useState({
    hourly: 0,
    daily: 0,
    weekly: 0,
    monthly: 0
  })

  const [nextDrawTimes, setNextDrawTimes] = useState({
    hourly: 0,
    daily: 0,
    weekly: 0,
    monthly: 0
  })

  const [suilendStats, setSuilendStats] = useState({
    deposited: 0,
    yieldEarned: 0,
    threshold: 10000
  })

  const getTimeUntil = (timestamp) => {
    const now = Date.now()
    const diff = timestamp - now
    
    if (diff <= 0) return 'Ready!'
    
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    
    return `${hours}h ${minutes}m`
  }

  const fetchPoolData = async () => {
    try {
      const poolObject = await client.getObject({
        id: POOL_ID,
        options: { showContent: true }
      })

      if (poolObject.data?.content?.dataType === 'moveObject') {
        const fields = poolObject.data.content.fields
        setPoolData({
          balance: parseInt(fields.balance || '0'),
          totalDeposited: parseInt(fields.total_deposited || '0'),
          whitelistSize: fields.whitelist?.fields?.contents?.length || 0,
          paused: fields.paused || false
        })
      }
    } catch (error) {
      console.error('Error fetching pool data:', error)
    }
  }

  const fetchUserSUI = async () => {
    if (!account) return
    try {
      const coins = await client.getCoins({
        owner: account.address,
        coinType: '0x2::sui::SUI'
      })
      setUserSUI(coins.data)
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
      const tickets = objects.data
        .filter(obj => obj.data?.content?.dataType === 'moveObject')
        .filter(obj => obj.data?.content?.fields?.pool_id === POOL_ID)
        .map(obj => ({
          objectId: obj.data.objectId,
          ...obj.data.content.fields
        }))
        }))
        }))
      
      setUserTickets(tickets)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  const fetchUserLuck = async () => {
    if (!account) return
    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::lottery_personal::PlayerLuck`
        },
        options: { showContent: true }
      })

      if (objects.data.length > 0) {
        const luckObj = objects.data[0]
        if (luckObj.data?.content?.dataType === 'moveObject') {
          setUserLuck({
            objectId: luckObj.data.objectId,
            ...luckObj.data.content.fields
          })
        }
      } else {
        setUserLuck(null)
      }
    } catch (error) {
      console.error('Error fetching luck:', error)
    }
  }

  const fetchJackpotBalances = async () => {
    try {
      const jackpotObject = await client.getObject({
        id: JACKPOT_TIERS_ID,
        options: { showContent: true }
      })

      if (jackpotObject.data?.content?.dataType === 'moveObject') {
        const fields = jackpotObject.data.content.fields
        setJackpotBalances({
          hourly: parseInt(fields.hourly_pool || '0'),
          daily: parseInt(fields.daily_pool || '0'),
          weekly: parseInt(fields.weekly_pool || '0'),
          monthly: parseInt(fields.monthly_pool || '0')
        })
        
        setNextDrawTimes({
          hourly: parseInt(fields.last_hourly_draw || '0') + 3600000,
          daily: parseInt(fields.last_daily_draw || '0') + 86400000,
          weekly: parseInt(fields.last_weekly_draw || '0') + 604800000,
          monthly: parseInt(fields.last_monthly_draw || '0') + 2592000000
        })
      }
    } catch (error) {
      console.error('Error fetching jackpots:', error)
    }
  }

  const fetchSuilendStats = async () => {
    try {
      const trackerObject = await client.getObject({
        id: SUILEND_TRACKER_ID,
        options: { showContent: true }
      })

      if (trackerObject.data?.content?.dataType === 'moveObject') {
        const fields = trackerObject.data.content.fields
        setSuilendStats({
          deposited: parseInt(fields.deposited_to_suilend || '0'),
          yieldEarned: parseInt(fields.total_yield_earned || '0'),
          threshold: parseInt(fields.auto_deposit_threshold || '10000')
        })
      }
    } catch (error) {
      console.error('Error fetching Suilend stats:', error)
    }
  }

const fetchSuilendAPY = async () => {
  try {
    const suilendClient = await SuilendClient.initialize(
      LENDING_MARKET_ID,
      LENDING_MARKET_TYPE,
      client,
      false
    )
    
    const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
    const usdcReserveIndex = suilendClient.findReserveArrayIndex(USDC_TYPE)
    const reserve = suilendClient.lendingMarket.reserves[Number(usdcReserveIndex)]
    
    if (!reserve) return
    
    const mintDecimals = reserve.mintDecimals
    const availableAmount = Number(reserve.availableAmount) / (10 ** mintDecimals)
    const borrowedAmount = (Number(reserve.borrowedAmount.value) / 1e18) / (10 ** mintDecimals)
    const depositedAmount = borrowedAmount + availableAmount
    const utilizationPercent = depositedAmount === 0 ? 0 : (borrowedAmount / depositedAmount) * 100
    
    const config = reserve.config.element
    const interestRateUtils = config.interestRateUtils
    const interestRateAprs = config.interestRateAprs.map((apr) => Number(apr) / 100)
    
    let borrowAprPercent = interestRateAprs[0]
    for (let i = 0; i < interestRateUtils.length - 1; i++) {
      const u1 = Number(interestRateUtils[i])
      const u2 = Number(interestRateUtils[i + 1])
      if (utilizationPercent >= u1 && utilizationPercent <= u2) {
        const slope = (interestRateAprs[i + 1] - interestRateAprs[i]) / (u2 - u1)
        borrowAprPercent = interestRateAprs[i] + slope * (utilizationPercent - u1)
        break
      }
    }
    
    const spreadFeeBps = Number(config.spreadFeeBps)
    const supplyAprPercent = (utilizationPercent / 100) * (borrowAprPercent / 100) * (1 - spreadFeeBps / 10000) * 100
    
    // Convert APR to APY with continuous compounding
    const blocksPerYear = 365 * 24 * 60 * 60 / 0.4
    const supplyApyPercent = (Math.pow(1 + (supplyAprPercent / 100) / blocksPerYear, blocksPerYear) - 1) * 100
    
    setSuilendAPY(supplyApyPercent)
  } catch (error) {
    console.error('Error fetching Suilend APY:', error)
  }
}  

const handleDeposit = async () => {
    if (!account || !depositAmount || parseFloat(depositAmount) <= 0) {
      setStatus('❌ Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      // Auto-create luck if user doesn't have it
      if (!userLuck) {
        setStatus('Creating your luck profile...')
        
        const luckTx = new Transaction()
        luckTx.moveCall({
          target: `${PACKAGE_ID}::lottery_personal::create_my_luck`,
          arguments: [
            luckTx.object(CLOCK_ID)
          ]
        })      
        
        await new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: luckTx },
            {
              onSuccess: () => {
                setTimeout(() => {
                  fetchUserLuck()
                  resolve()
                }, 2000)
              },
              onError: (error) => {
                console.error('Luck creation failed:', error)
                reject(error)
              }
            }
          )
        })
      }

      setStatus('Processing deposit...')

      const amountInMicroUSDC = Math.floor(parseFloat(depositAmount) * 1_000_000)
      const usdcCoin = userUSDC.find(coin => coin.balance >= amountInMicroUSDC)

      if (!usdcCoin) {
        setStatus('❌ Insufficient USDC balance')
        setLoading(false)
        return
      }

      const tx = new Transaction()
      const [coin] = tx.splitCoins(tx.object(usdcCoin.coinObjectId), [amountInMicroUSDC])

      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::deposit_smart`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(POOL_ID),
          tx.sharedObjectRef({
            objectId: DRAW_CONFIG_ID,
            initialSharedVersion: 684416539,
            mutable: false
          }),
          coin,
          tx.object(CLOCK_ID)
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Deposit successful:', result)
            setStatus('✅ Deposit successful! Ticket created.')
            setDepositAmount('')
            setTimeout(() => {
              fetchUserUSDC()
              fetchUserSUI()
              fetchUserTickets()
              fetchUserLuck()
              fetchPoolData()
              fetchJackpotBalances()
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

  const handleWithdraw = async () => {
    if (!account || !selectedTicket) {
      setStatus('❌ Please select a ticket')
      return
    }

    setLoading(true)
    setStatus('Processing withdrawal...')

    try {
      const tx = new Transaction()

      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::request_withdrawal`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(POOL_ID),
          tx.object(selectedTicket.objectId),
          tx.object(CLOCK_ID)
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Withdraw successful:', result)
            setStatus('✅ Withdrawal successful!')
            setSelectedTicket(null)
            setTimeout(() => {
              fetchUserUSDC()
              fetchUserSUI()
              fetchUserTickets()
              fetchUserLuck()
              fetchPoolData()
              fetchJackpotBalances()
              setLoading(false)
            }, 2000)
          },
          onError: (error) => {
            console.error('Withdraw failed:', error)
            setStatus('❌ Withdrawal failed: ' + error.message)
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

  const executeDraw = async (tier) => {
    if (!account) return

    setLoading(true)
    setStatus(`Executing ${tier} draw...`)

    try {
      const tx = new Transaction()
      const functionName = `execute_${tier}_draw`

      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::${functionName}`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(POOL_ID),
          tx.object(JACKPOT_TIERS_ID),
          tx.object(CLOCK_ID),
          tx.object(RANDOM_ID)
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Draw successful:', result)
            setStatus(`✅ ${tier.charAt(0).toUpperCase() + tier.slice(1)} draw executed! Winner selected.`)
            setTimeout(() => {
              fetchJackpotBalances()
              fetchPoolData()
              setLoading(false)
            }, 2000)
          },
          onError: (error) => {
            console.error('Draw failed:', error)
            setStatus('❌ Draw failed: ' + error.message)
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

useEffect(() => {
    // Always fetch public data
    fetchPoolData()
    fetchJackpotBalances().catch(err => console.error('Jackpot fetch failed:', err))
    fetchSuilendStats().catch(err => console.error('Suilend fetch failed:', err))
    fetchSuilendAPY().catch(err => console.error('APY fetch failed:', err))
    
    // Fetch user-specific data only if connected
    if (account) {
      fetchUserUSDC()
      fetchUserSUI()
      fetchUserTickets()
      fetchUserLuck()
    }

    const interval = setInterval(() => {
      // Always refresh public data
      fetchPoolData()
      fetchJackpotBalances().catch(err => console.error('Jackpot fetch failed:', err))
      fetchSuilendStats().catch(err => console.error('Suilend fetch failed:', err))
      fetchSuilendAPY().catch(err => console.error('APY fetch failed:', err))
      
      // Refresh user data only if connected
      if (account) {
        fetchUserUSDC()
        fetchUserSUI()
        fetchUserTickets()
        fetchUserLuck()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [account])

  const totalUSDC = userUSDC.reduce((sum, coin) => sum + parseInt(coin.balance), 0) / 1_000_000
  const totalSUI = userSUI.reduce((sum, coin) => sum + parseInt(coin.balance), 0) / 1_000_000_000

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%)',
      color: '#e0e6ed',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(10, 14, 39, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(76, 209, 55, 0.2)',
        padding: '20px 40px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
  margin: 0,
  fontSize: '32px',
  fontWeight: 'bold',
  background: 'linear-gradient(90deg, #4cd137 0%, #44bd32 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}}>
  🍀 LuckyVault
</h1>
<p style={{
  margin: '5px 0 0 0',
  fontSize: '18px',
  color: '#4cd137',
  fontWeight: 'bold',
  letterSpacing: '1px'
}}>
  The No-Loss Lottery
</p>
<p style={{
  margin: '5px 0 0 0',
  fontSize: '14px',
  color: '#7f8fa6',
  letterSpacing: '0.5px'
}}>
  Save Money · Win Big · Zero Risk
</p>
          </div>
          <ConnectButton />
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        {/* Connect Wallet Overlay */}
        <>
            {/* Monthly Ultra Jackpot Hero */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(68, 189, 50, 0.15) 0%, rgba(76, 209, 55, 0.05) 100%)',
              border: '2px solid rgba(76, 209, 55, 0.3)',
              borderRadius: '24px',
              padding: '40px',
              marginBottom: '30px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(76, 209, 55, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}></div>
              <div style={{
                fontSize: '16px',
                color: '#4cd137',
                fontWeight: 'bold',
                letterSpacing: '2px',
                marginBottom: '15px'
              }}>
                💎 MONTHLY ULTRA JACKPOT 💎
              </div>
              <div style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '10px',
                textShadow: '0 0 30px rgba(76, 209, 55, 0.5)'
              }}>
                ${(jackpotBalances.monthly / 1_000_000).toFixed(2)}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#7f8fa6'
              }}>
                Next draw: {getTimeUntil(nextDrawTimes.monthly)}
              </div>
            </div>

            {/* Active Prize Pools */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.5)',
              border: '1px solid rgba(76, 209, 55, 0.2)',
              borderRadius: '24px',
              padding: '30px',
              marginBottom: '30px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '25px',
                textAlign: 'center',
                color: '#4cd137',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                🍀 ACTIVE PRIZE POOLS 🍀
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {/* Hourly */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(76, 209, 55, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'transform 0.3s, border-color 0.3s',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
                  <div style={{ fontSize: '14px', color: '#7f8fa6', marginBottom: '10px' }}>HOURLY</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    ${(jackpotBalances.hourly / 1_000_000).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#4cd137',
                    background: 'rgba(76, 209, 55, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    {getTimeUntil(nextDrawTimes.hourly)}
                  </div>
                </div>

                {/* Daily */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(76, 209, 55, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'transform 0.3s, border-color 0.3s',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>☀️</div>
                  <div style={{ fontSize: '14px', color: '#7f8fa6', marginBottom: '10px' }}>DAILY</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    ${(jackpotBalances.daily / 1_000_000).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#4cd137',
                    background: 'rgba(76, 209, 55, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    {getTimeUntil(nextDrawTimes.daily)}
                  </div>
                </div>

                {/* Weekly */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(76, 209, 55, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'transform 0.3s, border-color 0.3s',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🌟</div>
                  <div style={{ fontSize: '14px', color: '#7f8fa6', marginBottom: '10px' }}>WEEKLY</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    ${(jackpotBalances.weekly / 1_000_000).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#4cd137',
                    background: 'rgba(76, 209, 55, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    {getTimeUntil(nextDrawTimes.weekly)}
                  </div>
                </div>

                {/* Monthly */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(76, 209, 55, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'transform 0.3s, border-color 0.3s',
                  cursor: 'pointer'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>💎</div>
                  <div style={{ fontSize: '14px', color: '#7f8fa6', marginBottom: '10px' }}>MONTHLY</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    ${(jackpotBalances.monthly / 1_000_000).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#4cd137',
                    background: 'rgba(76, 209, 55, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    {getTimeUntil(nextDrawTimes.monthly)}
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
{/* Draw Countdowns */}
<DrawCountdowns />
              
              {/* Left Column - Your Dashboard */}
              <div>

                {/* Deposit Section */}
                <div style={{
                  background: 'rgba(26, 31, 58, 0.5)',
                  border: '1px solid rgba(76, 209, 55, 0.2)',
                  borderRadius: '24px',
                  padding: '30px',
                  marginBottom: '20px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    marginBottom: '20px',
                    color: '#fff'
                  }}>
                    💰 Deposit USDC
                  </h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      fontSize: '14px',
                      color: '#7f8fa6'
                    }}>
                      <span>Your Balance</span>
                      <span style={{ color: '#4cd137' }}>{totalUSDC.toFixed(2)} USDC</span>
                    </div>
                    
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '18px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(76, 209, 55, 0.3)',
                        borderRadius: '12px',
                        color: '#fff',
                        outline: 'none',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#4cd137'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(76, 209, 55, 0.3)'}
                    />
                  </div>

          <button
                    onClick={handleDeposit}
                    disabled={loading || !depositAmount || !account}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      background: (loading || !depositAmount || !account) ? 'rgba(127, 143, 166, 0.3)' : 'linear-gradient(135deg, #4cd137 0%, #44bd32 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: (loading || !depositAmount || !account) ? 'not-allowed' : 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      boxShadow: '0 4px 15px rgba(76, 209, 55, 0.3)'
                    }}
                  >
                    {!account ? '🔒 Connect Wallet to Deposit' : loading ? '⏳ Processing...' : '💰 Deposit & Win'}
                  </button>
                </div>

                {/* User Stats */}
                <div style={{
                  background: 'rgba(26, 31, 58, 0.5)',
                  border: '1px solid rgba(76, 209, 55, 0.2)',
                  borderRadius: '24px',
                  padding: '30px',
                  marginBottom: '20px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    marginBottom: '20px',
                    color: '#fff'
                  }}>
                    📊 Your Stats
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>Active Tickets</span>
                      <span style={{ color: '#4cd137', fontWeight: 'bold' }}>{userTickets.length}</span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>Total Deposited</span>
                      <span style={{ color: '#4cd137', fontWeight: 'bold' }}>
                        ${(userTickets.reduce((sum, t) => sum + parseInt(t.amount), 0) / 1_000_000).toFixed(2)}
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>USDC Balance</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{totalUSDC.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Luck Meter */}
                {userLuck && account && (
  <LuckMeter userAddress={account.address} onLuckLoaded={setUserLuck} />
)}
              </div>

              {/* Right Column - Withdraw & Platform Stats */}
              <div>
                {/* Withdraw Section */}
                <div style={{
                  background: 'rgba(26, 31, 58, 0.5)',
                  border: '1px solid rgba(76, 209, 55, 0.2)',
                  borderRadius: '24px',
                  padding: '30px',
                  marginBottom: '20px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    marginBottom: '20px',
                    color: '#fff'
                  }}>
                    💸 Withdraw Funds
                  </h3>

                  {/* ADD THIS - 30s delay notice */}
                  <div style={{
                    padding: '12px 16px',
                    marginBottom: '20px',
                    background: 'rgba(52, 152, 219, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(52, 152, 219, 0.3)',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: '1.5'
                  }}>
                    ℹ️ <strong>Note:</strong> If pool balance is insufficient, funds will be automatically withdrawn from Suilend. 
                    This process may take up to 30 seconds. Please retry if your withdrawal fails initially.
                  </div>

                  {userTickets.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '30px',
                      color: '#7f8fa6'
                    }}>
                      No active tickets to withdraw
                    </div>
                  ) : (
                    <>
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginBottom: '20px',
                        padding: '10px'
                      }}>
                        {userTickets.map((ticket) => (
                          <div
                            key={ticket.objectId}
                            onClick={() => setSelectedTicket(ticket)}
                            style={{
                              padding: '15px',
                              marginBottom: '10px',
                              background: selectedTicket?.objectId === ticket.objectId 
                                ? 'rgba(76, 209, 55, 0.2)' 
                                : 'rgba(15, 23, 42, 0.8)',
                              border: selectedTicket?.objectId === ticket.objectId 
                                ? '2px solid #4cd137' 
                                : '1px solid rgba(76, 209, 55, 0.3)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ color: '#fff', fontWeight: 'bold' }}>
                                ${(parseInt(ticket.amount) / 1_000_000).toFixed(2)}
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: '#7f8fa6'
                              }}>
                                Ticket #{ticket.objectId.slice(-6)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleWithdraw}
                        disabled={!selectedTicket || loading || !account}
                        style={{
                          width: '100%',
                          padding: '16px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          background: (!selectedTicket || loading || !account) 
                            ? 'rgba(127, 143, 166, 0.3)' 
                            : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: (!selectedTicket || loading || !account) ? 'not-allowed' : 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                      >
                        {!account ? '🔒 Connect Wallet' : loading ? '⏳ Processing...' : '💸 Withdraw'}
                      </button>
                    </>
                  )}
                </div>

                {/* Platform Statistics */}
                <div style={{
                  background: 'rgba(26, 31, 58, 0.5)',
                  border: '1px solid rgba(76, 209, 55, 0.2)',
                  borderRadius: '24px',
                  padding: '30px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    marginBottom: '20px',
                    color: '#fff'
                  }}>
                    🌐 Platform Stats
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>Total Deposited</span>
                      <span style={{ color: '#4cd137', fontWeight: 'bold' }}>
                        ${((poolData?.totalDeposited || 0) / 1_000_000).toFixed(2)}
                      </span>
                    </div>
                    
                  
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>In Suilend</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>
                        ${(suilendStats.deposited / 1_000_000).toFixed(2)}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>Yield Earned</span>
                      <span style={{ color: '#4cd137', fontWeight: 'bold' }}>
                        ${(suilendStats.yieldEarned / 1_000_000).toFixed(2)}
                      </span>
                    </div>
                    
                    
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '10px',
                      border: '1px solid rgba(76, 209, 55, 0.2)'
                    }}>
                      <span style={{ color: '#7f8fa6' }}>Current APY</span>
                      <span style={{ color: '#4cd137', fontWeight: 'bold' }}>
  {suilendAPY.toFixed(2)}%
</span>
                    </div>

                    
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(76, 209, 55, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(76, 209, 55, 0.15)',
                      fontSize: '11px',
                      color: '#7f8fa6',
                      lineHeight: '1.4'
                    }}>
                      ℹ️ APY calculated from live Suilend on-chain data. Rates fluctuate based on market utilization.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Draw Controls */}
            {account?.address === '0x01efafa2098e9cf9f89dfd16c11e07a05f89d4d745a466369aee195ae7d9acb4' && (
              <div style={{
                background: 'rgba(26, 31, 58, 0.5)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                borderRadius: '24px',
                padding: '30px',
                marginTop: '30px',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  marginBottom: '20px',
                  color: '#e74c3c',
                  textAlign: 'center'
                }}>
                  🎲 Execute Draws (Admin Only)
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  <button
                    onClick={() => executeDraw('hourly')}
                    disabled={loading || Date.now() < nextDrawTimes.hourly}
                    style={{
                      padding: '20px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      background: Date.now() >= nextDrawTimes.hourly 
                        ? 'linear-gradient(135deg, #4cd137 0%, #44bd32 100%)' 
                        : 'rgba(127, 143, 166, 0.3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: Date.now() >= nextDrawTimes.hourly ? 'pointer' : 'not-allowed',
                      transition: 'transform 0.2s'
                    }}
                  >
                    ⚡ Hourly Draw
                    <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
                      ${(jackpotBalances.hourly / 1_000_000).toFixed(2)}
                    </div>
                  </button>

                  <button
                    onClick={() => executeDraw('daily')}
                    disabled={loading || Date.now() < nextDrawTimes.daily}
                    style={{
                      padding: '20px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      background: Date.now() >= nextDrawTimes.daily 
                        ? 'linear-gradient(135deg, #4cd137 0%, #44bd32 100%)' 
                        : 'rgba(127, 143, 166, 0.3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: Date.now() >= nextDrawTimes.daily ? 'pointer' : 'not-allowed',
                      transition: 'transform 0.2s'
                    }}
                  >
                    ☀️ Daily Draw
                    <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
                      ${(jackpotBalances.daily / 1_000_000).toFixed(2)}
                    </div>
                  </button>

                  <button
                    onClick={() => executeDraw('weekly')}
                    disabled={loading || Date.now() < nextDrawTimes.weekly}
                    style={{
                      padding: '20px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      background: Date.now() >= nextDrawTimes.weekly 
                        ? 'linear-gradient(135deg, #4cd137 0%, #44bd32 100%)' 
                        : 'rgba(127, 143, 166, 0.3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: Date.now() >= nextDrawTimes.weekly ? 'pointer' : 'not-allowed',
                      transition: 'transform 0.2s'
                    }}
                  >
                    🌟 Weekly Draw
                    <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
                      ${(jackpotBalances.weekly / 1_000_000).toFixed(2)}
                    </div>
                  </button>

                  <button
                    onClick={() => executeDraw('monthly')}
                    disabled={loading || Date.now() < nextDrawTimes.monthly}
                    style={{
                      padding: '20px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      background: Date.now() >= nextDrawTimes.monthly 
                        ? 'linear-gradient(135deg, #4cd137 0%, #44bd32 100%)' 
                        : 'rgba(127, 143, 166, 0.3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: Date.now() >= nextDrawTimes.monthly ? 'pointer' : 'not-allowed',
                      transition: 'transform 0.2s'
                    }}
                  >
                    💎 Monthly Draw
                    <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
                      ${(jackpotBalances.monthly / 1_000_000).toFixed(2)}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Status Message */}
            {status && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: status.includes('✅') 
                  ? 'rgba(76, 209, 55, 0.2)' 
                  : status.includes('❌') 
                  ? 'rgba(231, 76, 60, 0.2)' 
                  : 'rgba(127, 143, 166, 0.2)',
                border: `1px solid ${status.includes('✅') 
                  ? 'rgba(76, 209, 55, 0.5)' 
                  : status.includes('❌') 
                  ? 'rgba(231, 76, 60, 0.5)' 
                  : 'rgba(127, 143, 166, 0.5)'}`,
                borderRadius: '12px',
                color: '#fff',
                textAlign: 'center',
                fontSize: '14px'
              }}>
                {status}
              </div>
            )}
          </>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#7f8fa6',
        fontSize: '14px',
        borderTop: '1px solid rgba(76, 209, 55, 0.2)'
      }}>
        <p style={{ margin: 0 }}>
          🍀 LuckyVault - Where Everyone Wins | Powered by Sui Blockchain
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
          Save Money · Win Big · Zero Risk | Current APY: {suilendAPY.toFixed(2)}%
        </p>
      </div>
    </div>
  )
}

export default App
/* Build: Sat Nov 15 11:55:44 EST 2025 */
