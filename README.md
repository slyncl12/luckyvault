# 🎰 LuckyVault - No-Loss Lottery on Sui

A decentralized lottery protocol where players can't lose their principal. Built in 48 hours from zero blockchain experience.

## 🚀 Live Demo

**Testnet dApp:** https://luckyvault-livid.vercel.app

⚠️ **TESTNET ONLY** - Using test SUI, no real money involved

## 📜 Smart Contract Info

### Current Deployment (Secured - v2)
```
Network: Sui Testnet
Package ID: 0x8b5ccbd16c918069a0e7a86c718b899f212e1ea8b74c8d3f33d0e250f1807a8a
Pool ID: 0xfdead79e77811bb10c412b0ff0f7dd12479db52d2a5902339a84c4ef6f61c16d
AdminCap: 0xd4cf9f9122d43f58e9b2333aa67a3ed8711646c88c207fc04c0796a9808eccfc
```

### Previous Deployment (v1 - Unsecured)
```
Package ID: 0x3666d60bf69968abe4e4879c75e91e3f301804c0c7be0d4cbe2a5d0bd6bd4242
Pool ID: 0x06b723afcfcacdbbd302bb51083a5fb569e96d199e61499591d925a0f1c407b0
```

**Explorer:** https://testnet.suiscan.xyz/testnet/object/0x8b5ccbd16c918069a0e7a86c718b899f212e1ea8b74c8d3f33d0e250f1807a8a

## 🎯 Concept

Traditional lotteries have a **house edge of 50%** - meaning players lose half their money regardless of winning.

**LuckyVault changes this:**
1. Players **deposit** SUI (not buy tickets)
2. Deposits earn **7% yield** through staking
3. Only the **yield** becomes prize money
4. Players can **withdraw** their principal anytime
5. **No one loses money** - only gains or stays even

## ✨ Features

### Current (v2 - Secured)
- ✅ Deposit SUI and receive lottery tickets
- ✅ 1 SUI = 1 ticket
- ✅ Withdraw deposits anytime
- ✅ Winner selection with prize distribution
- ✅ AdminCap security (only admin can draw)
- ✅ Minimum deposit: 0.1 SUI
- ✅ Overflow protection
- ✅ Event emission for tracking
- ✅ Recent winners display

### Coming Soon
- 🚧 Sui VRF integration (better randomness)
- 🚧 Yield generation through staking
- 🚧 Automatic scheduled draws
- 🚧 Multiple prize tiers
- 🚧 Emergency pause mechanism

## 🛠️ Tech Stack

### Smart Contract
- **Language:** Move
- **Blockchain:** Sui
- **Version:** Testnet

### Frontend
- **Framework:** React 18 + Vite
- **Wallet:** @mysten/dapp-kit
- **Styling:** CSS3 (custom)
- **Hosting:** Vercel

### Tools
- **SDK:** @mysten/sui.js
- **Query:** @tanstack/react-query
- **CLI:** Sui CLI v1.58.3

## 🏗️ Architecture
```
User
  ↓
Frontend (React)
  ↓
Sui Wallet
  ↓
Smart Contract (Move)
  ↓
Sui Blockchain (Testnet)
```

## 🔒 Security Features

### Implemented
1. **AdminCap Pattern** - Only authorized admin can draw winners
2. **Minimum Deposit** - 0.1 SUI minimum prevents spam attacks
3. **Overflow Checks** - Safe arithmetic operations
4. **Balance Validation** - Always verify sufficient balance
5. **Error Codes** - Clear error messages for debugging

### TODO (Before Mainnet)
- [ ] Integrate Sui VRF for randomness
- [ ] Professional security audit
- [ ] Emergency pause mechanism
- [ ] Rate limiting
- [ ] Reentrancy guards
- [ ] Fuzz testing

## 📦 Installation & Local Development

### Prerequisites
```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Verify installation
sui --version
```

### Smart Contract
```bash
cd move/lottery_pool

# Build contract
sui move build

# Test contract
sui move test

# Deploy to testnet
sui client publish --gas-budget 100000000
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod --public
```

## 🎮 How to Use

### For Users
1. Visit https://luckyvault-livid.vercel.app
2. Install [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet)
3. Switch wallet to **Testnet mode**
4. Get test SUI from [faucet](https://faucet.sui.io)
5. Connect wallet on dApp
6. Deposit SUI (minimum 0.1 SUI)
7. Receive lottery tickets
8. Wait for draw or withdraw anytime

### For Admin (Drawing Winners)
```bash
# Draw winner and distribute prize
sui client call \
  --package 0x8b5ccbd16c918069a0e7a86c718b899f212e1ea8b74c8d3f33d0e250f1807a8a \
  --module lottery_pool \
  --function draw_winner \
  --args ADMIN_CAP_ID POOL_ID PRIZE_AMOUNT \
  --gas-budget 10000000
```

## 📊 Project Timeline

### Day 1 (48 hours ago)
- Installed development environment
- Learned Move programming language
- Wrote initial smart contract
- Deployed to Sui testnet
- Tested deposits & withdrawals

### Day 2 (24 hours ago)
- Added multi-player support
- Implemented winner selection
- Built React frontend
- Integrated wallet connection
- Deployed to Vercel (public)

### Day 3 (Today)
- Security audit and fixes
- Added AdminCap protection
- Implemented minimum deposit
- Added overflow checks
- Improved error handling

## 🗺️ Roadmap

### Week 1
- [x] Core contract functionality
- [x] Frontend with wallet integration
- [x] Public deployment
- [x] Security improvements
- [ ] Sui VRF integration

### Month 1
- [ ] Yield generation (staking integration)
- [ ] Automatic scheduled draws
- [ ] Multiple prize tiers
- [ ] Professional security audit

### Month 3
- [ ] Mainnet deployment
- [ ] Token launch (SLOTTO)
- [ ] Partnership with traditional operators
- [ ] Marketing campaign

### Month 6+
- [ ] Mobile app
- [ ] Cross-chain expansion
- [ ] Advanced lottery types
- [ ] DAO governance

## 📈 Stats (Testnet)
```
Total Deposits: 2+ SUI
Total Participants: 2+
Total Draws: 2
Winners Paid: 2
Total Prizes: 0.2 SUI
Uptime: 100%
```

## 🤝 Contributing

Currently in early development. Contributions welcome!

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

## ⚖️ License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- **Sui Foundation** - For the amazing blockchain platform
- **Mysten Labs** - For comprehensive documentation
- **Move Language** - For safe smart contract development
- **Anthropic Claude** - For AI assistance during development

## 📞 Contact

- **Twitter:** @luckyvaultsui (coming soon)
- **Discord:** Join Sui Discord
- **Email:** Coming soon

## ⚠️ Disclaimer

**THIS IS A TESTNET DEMO**

- Not audited for production use
- Using test SUI with no real value
- Educational/experimental purposes only
- No guarantees or warranties
- Use at your own risk

**DO NOT use on mainnet without:**
- Professional security audit
- Legal consultation
- Thorough testing
- Proper insurance

## 🎓 What I Learned

Building LuckyVault from scratch with zero blockchain experience taught me:

1. **Move Programming** - Sui's smart contract language
2. **Blockchain Architecture** - How dApps work
3. **Wallet Integration** - Connecting to Sui wallets
4. **Security Patterns** - AdminCap, overflow checks, error handling
5. **Full-Stack Web3** - React + Smart Contracts
6. **Deployment** - Vercel + Sui testnet
7. **Building in Public** - Documenting the journey

**Time invested:** 48 hours
**Lines of code:** ~800
**Bugs fixed:** Too many to count
**Lessons learned:** Priceless

---

**Built with ❤️ on Sui**

**From zero to deployed in 2 days**

🎰 **LuckyVault - Where Everyone Wins** 🎰
