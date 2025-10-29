import { useState, useEffect } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import './App.css'

const PACKAGE_ID = '0x8b5ccbd16c918069a0e7a86c718b899f212e1ea8b74c8d3f33d0e250f1807a8a'
const POOL_ID = '0xfdead79e77811bb10c412b0ff0f7dd12479db52d2a5902339a84c4ef6f61c16d'

function App() {
  const [poolData, setPoolData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('1')
  const [userTickets, setUserTickets] = useState([])
  const [winnerHistory, setWinnerHistory] = useState([])
  
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  useEffect(() => {
    loadPoolData()
    loadWinnerHistory()
  }, [])

  useEffect(() => {
    if (account) {
      loadUserTickets()
    }
  }, [account])

  const loadPoolData = async () => {
    try {
      const object = await client.getObject({
        id: POOL_ID,
        options: { showContent: true }
      })

      const fields = object.data.content.fields
      setPoolData({
        balance: (fields.balance / 1_000_000_000).toFixed(2),
        totalDeposits: (fields.total_deposits / 1_000_000_000).toFixed(2),
        totalTickets: fields.total_tickets,
        participants: fields.participants.fields.contents.length
      })
      setLoading(false)
    } catch (error) {
      console.error('Error loading pool:', error)
      setLoading(false)
    }
  }

  const loadUserTickets = async () => {
    if (!account) return
    
    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::lottery_pool::Ticket`
        },
        options: { showContent: true }
      })
      
      setUserTickets(objects.data)
    } catch (error) {
      console.error('Error loading tickets:', error)
    }
  }

  const loadWinnerHistory = async () => {
    try {
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::lottery_pool::WinnerEvent`
        },
        limit: 10
      })
      
      setWinnerHistory(events.data)
    } catch (error) {
      console.error('Error loading winners:', error)
    }
  }

  const handleDeposit = async () => {
    if (!account) {
      alert('Please connect your wallet first!')
      return
    }

    try {
      const tx = new Transaction()
      
      const amountInMist = parseFloat(depositAmount) * 1_000_000_000
      const [coin] = tx.splitCoins(tx.gas, [amountInMist])
      
      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_pool::deposit`,
        arguments: [
          tx.object(POOL_ID),
          coin
        ]
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('Deposit successful!', result)
            alert('Deposit successful! Check your tickets!')
            await loadPoolData()
            await loadUserTickets()
          },
          onError: (error) => {
            console.error('Deposit failed:', error)
            alert('Deposit failed: ' + error.message)
          }
        }
      )
    } catch (error) {
      console.error('Error creating deposit:', error)
      alert('Error: ' + error.message)
    }
  }

  const handleWithdraw = async (ticketId) => {
    if (!account) return

    try {
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_pool::withdraw`,
        arguments: [
          tx.object(POOL_ID),
          tx.object(ticketId)
        ]
      })

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('Withdrawal successful!', result)
            alert('Withdrawal successful!')
            await loadPoolData()
            await loadUserTickets()
          },
          onError: (error) => {
            console.error('Withdrawal failed:', error)
            alert('Withdrawal failed: ' + error.message)
          }
        }
      )
    } catch (error) {
      console.error('Error creating withdrawal:', error)
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return <div className="app">Loading LuckyVault...</div>
  }

  return (
    <div className="app">
    <div className="testnet-banner">
        ⚠️ TESTNET DEMO - Using test SUI only (no real money)
      </div>
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <h1>🎰 LuckyVault</h1>
            <p className="tagline">The No-Loss Lottery on Sui</p>
          </div>
          <div className="wallet-section">
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="container">
        {account && (
          <div className="user-info">
            <h3>👤 Your Account</h3>
            <p className="wallet-address">{account.address}</p>
            <p className="ticket-count">Your Tickets: {userTickets.length}</p>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Pool Balance</div>
            <div className="stat-value">{poolData.balance} SUI</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Deposits</div>
            <div className="stat-value">{poolData.totalDeposits} SUI</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Tickets</div>
            <div className="stat-value">{poolData.totalTickets}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Participants</div>
            <div className="stat-value">{poolData.participants}</div>
          </div>
        </div>

        {account ? (
          <>
            <div className="action-card">
              <h2>💰 Deposit SUI</h2>
              <p>Get lottery tickets! 1 SUI = 1 Ticket</p>
              <div className="deposit-form">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0.1"
                  step="0.1"
                  placeholder="Amount in SUI"
                  className="input"
                />
                <button onClick={handleDeposit} className="btn-primary">
                  Deposit {depositAmount} SUI
                </button>
              </div>
            </div>

            {userTickets.length > 0 && (
              <div className="tickets-card">
                <h2>🎫 Your Tickets</h2>
                <div className="tickets-list">
                  {userTickets.map((ticket, idx) => {
                    const amount = ticket.data?.content?.fields?.amount
                    return (
                      <div key={idx} className="ticket-item">
                        <div className="ticket-info">
                          <span className="ticket-number">Ticket #{idx + 1}</span>
                          <span className="ticket-amount">
                            {amount ? (amount / 1_000_000_000).toFixed(2) : '0'} SUI
                          </span>
                        </div>
                        <button
                          onClick={() => handleWithdraw(ticket.data.objectId)}
                          className="btn-secondary"
                        >
                          Withdraw
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="action-card">
            <h2>🔐 Connect Wallet to Play</h2>
            <p>Connect your Sui wallet to deposit and get lottery tickets!</p>
          </div>
        )}

        {winnerHistory.length > 0 && (
          <div className="winners-card">
            <h2>🏆 Recent Winners</h2>
            <div className="winners-list">
              {winnerHistory.map((event, idx) => {
                const data = event.parsedJson
                return (
                  <div key={idx} className="winner-item">
                    <span className="winner-number">#{idx + 1}</span>
                    <span className="winner-address">
                      {data.winner.slice(0, 10)}...{data.winner.slice(-8)}
                    </span>
                    <span className="winner-prize">
                      {(data.prize / 1_000_000_000).toFixed(2)} SUI
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="info-card">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <div>
                <h3>Deposit SUI</h3>
                <p>Your money stays safe in the pool</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div>
                <h3>Get Tickets</h3>
                <p>1 SUI = 1 lottery ticket</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div>
                <h3>Win Prizes</h3>
                <p>Winners get paid, losers keep their deposit</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <div>
                <h3>Withdraw Anytime</h3>
                <p>Get your SUI back whenever you want</p>
              </div>
            </div>
          </div>
        </div>

        <div className="contract-info">
          <h3>Contract Info</h3>
          <div className="contract-details">
            <div className="contract-row">
              <span className="label">Package:</span>
              <code className="address">{PACKAGE_ID.slice(0, 20)}...</code>
            </div>
            <div className="contract-row">
              <span className="label">Pool:</span>
              <code className="address">{POOL_ID.slice(0, 20)}...</code>
            </div>
            <div className="contract-row">
              <span className="label">Network:</span>
              <span className="network">Sui Testnet</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>Built on Sui • Day 2 of building in public • LuckyVault v1.0</p>
      </footer>
    </div>
  )
}

export default App
