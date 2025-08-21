# RWA DeFi Smart Contracts

A comprehensive DeFi platform featuring a professional ERC20 token with advanced features and a multi-pool staking system.

## 🏗️ Architecture

### RWA Token (RwaToken.sol)
Professional ERC20 token contract with advanced features:
- **Standard ERC20** functionality with OpenZeppelin v5.x
- **ERC20Votes** for governance voting power
- **Pausable** transfers for emergency situations
- **Burnable** tokens for deflationary mechanics
- **Minting** with supply cap and cooldown protection
- **Transfer fees** with exemption whitelist
- **Blacklist** functionality for compliance
- **Access controls** via Ownable pattern

### Multi Pool Staking (Staking.sol)
Flexible staking system supporting multiple token pools:
- **Multiple pools** with different configurations
- **Configurable rewards** with per-second distribution
- **Lock periods** to prevent immediate unstaking
- **Emergency unstaking** with configurable fees
- **Pool management** with owner controls
- **Comprehensive view functions** for frontend integration

## 🚀 Quick Start

### Prerequisites
- Node.js v16+ 
- npm or yarn

### Installation & Setup
```bash
cd contracts
npm install
```

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
# Run all tests (38 tests)
npm test

# Run specific contract tests
npm run test:rwa      # RWA Token tests (19 tests)
npm run test:staking  # Staking tests (19 tests)
```

### Deploy Contracts
```bash
# Deploy both contracts with initial setup
npm run deploy

# Deploy individually
npm run deploy:rwa      # RWA Token only
npm run deploy:staking  # Staking contract only
```

### Start Local Development
```bash
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy contracts
npm run deploy

# Terminal 3: Verify deployment
npm run verify-deployment
```

## 📋 Contract Specifications

### RWA Token Features

#### Core Token Properties
- **Name**: RWA Token
- **Symbol**: RWA  
- **Decimals**: 18
- **Initial Supply**: 100,000,000 tokens
- **Maximum Supply**: 1,000,000,000 tokens

#### Advanced Features
- **Minting Controls**: 30-day cooldown, supply cap enforcement
- **Transfer Fees**: Configurable fees with exemption system
- **Governance**: ERC20Votes for DAO voting power
- **Compliance**: Blacklist system for regulatory requirements
- **Security**: Pausable, reentrancy protection, access controls

#### Key Functions
```solidity
// Minting (owner only, with cooldown)
function mint(address to, uint256 amount) external

// Transfer with fees
function transfer(address to, uint256 amount) public override

// Admin functions
function setTransferFee(uint256 newFee, address newCollector) external
function setBlacklisted(address account, bool status) external
function pause() external / unpause() external
```

### Multi Pool Staking Features

#### Pool Configuration
- **Flexible Setup**: Each pool can have different tokens, limits, and rewards
- **Reward System**: Per-second reward distribution
- **Lock Periods**: Configurable lock times per pool
- **Limits**: Min/max staking amounts per pool

#### Core Functions
```solidity
// Pool management (owner only)
function addPool(address token, uint256 maxStake, uint256 minStake, 
                uint256 rewardRate, uint256 lockPeriod) external

// User staking
function stake(uint256 poolId, uint256 amount) external
function unstake(uint256 poolId, uint256 amount) external
function claimRewards(uint256 poolId) external

// Emergency functions
function emergencyUnstake(uint256 poolId) external
```

## 🧪 Testing

### Test Coverage
- **38 comprehensive tests** covering all major functionality
- **Gas optimization** testing
- **Edge case** validation
- **Security scenario** testing
- **Integration** testing between contracts

### Test Categories

#### RWA Token Tests (19 tests)
- ✅ Deployment verification
- ✅ Minting functionality and restrictions  
- ✅ Transfer fees and exemptions
- ✅ Blacklist functionality
- ✅ Pause/unpause mechanisms
- ✅ Voting power tracking
- ✅ Admin function access controls

#### Staking Tests (19 tests)
- ✅ Pool management (add/update pools)
- ✅ Staking functionality and restrictions
- ✅ Unstaking with lock period enforcement
- ✅ Reward calculation and claiming
- ✅ Emergency unstaking with fees
- ✅ View functions and utilities
- ✅ Admin controls and fee collection

## 🔧 Configuration

### Hardhat Configuration
```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  paths: {
    sources: "./staking",
    tests: "./test"
  }
};
```

### Default Pool Settings
- **Max Stake Limit**: 1,000,000 tokens
- **Min Stake Amount**: 100 tokens  
- **Reward Rate**: 0.1 tokens per second
- **Lock Period**: 86,400 seconds (1 day)
- **Emergency Fee**: 5% (500 basis points)

## 📚 Usage Examples

### Basic Token Operations
```javascript
const rwaToken = await ethers.getContractAt("RWAToken", tokenAddress);

// Check balance
const balance = await rwaToken.balanceOf(userAddress);

// Transfer tokens
await rwaToken.transfer(recipient, ethers.parseEther("100"));

// Approve spending
await rwaToken.approve(spender, ethers.parseEther("1000"));
```

### Staking Operations
```javascript
const staking = await ethers.getContractAt("MultiPoolStaking", stakingAddress);

// Stake tokens
await rwaToken.approve(stakingAddress, stakeAmount);
await staking.stake(0, stakeAmount);

// Check rewards
const pending = await staking.pendingRewards(0, userAddress);

// Claim rewards
await staking.claimRewards(0);

// Unstake (after lock period)
await staking.unstake(0, unstakeAmount);
```

### Admin Operations
```javascript
// Add new staking pool
await staking.addPool(
  tokenAddress,
  ethers.parseEther("1000000"), // max stake
  ethers.parseEther("100"),     // min stake  
  ethers.parseEther("0.1"),     // reward rate
  86400                         // lock period
);

// Set transfer fee
await rwaToken.setTransferFee(100, feeCollectorAddress); // 1%

// Pause contract
await rwaToken.pause();
```

## 🔐 Security Features

### Access Controls
- **Ownable Pattern**: Critical functions restricted to owner
- **Role-based Access**: Authorized minters for token minting
- **Multi-signature Ready**: Compatible with multi-sig wallets

### Protection Mechanisms
- **Reentrancy Guards**: All external functions protected
- **Integer Overflow**: SafeMath via Solidity 0.8.x
- **Pause Mechanism**: Emergency stop functionality
- **Supply Caps**: Maximum supply enforcement
- **Cooldown Periods**: Prevent rapid minting abuse

### Compliance Features
- **Blacklist System**: Block suspicious addresses
- **Transfer Restrictions**: Configurable transfer limits
- **Fee System**: Regulatory compliance support
- **Audit Trail**: Comprehensive event logging

## 📊 Gas Optimization

### Efficient Patterns
- **Storage Packing**: Optimized struct layouts
- **Batch Operations**: Reduce transaction costs
- **View Functions**: Off-chain data queries
- **Event Indexing**: Efficient log filtering

### Estimated Gas Costs
- **Token Transfer**: ~65,000 gas
- **Stake Tokens**: ~120,000 gas
- **Claim Rewards**: ~85,000 gas
- **Add Pool**: ~180,000 gas

## 🛠️ Development Scripts

```bash
# Development
npm run compile          # Compile contracts
npm run clean           # Clean artifacts
npm test               # Run all tests

# Deployment  
npm run deploy         # Deploy both contracts
npm run deploy:rwa     # Deploy token only
npm run deploy:staking # Deploy staking only

# Utilities
npm run node           # Start local node
npm run verify-deployment # Verify contracts
npm run interact       # Interaction examples
```

## 📁 Project Structure

```
contracts/
├── staking/                 # Smart contracts
│   ├── RwaToken.sol        # ERC20 token with advanced features
│   └── Staking.sol         # Multi-pool staking system
├── test/                   # Comprehensive test suite
│   ├── RwaToken.test.js    # Token contract tests
│   └── Staking.test.js     # Staking contract tests
├── scripts/                # Deployment and utility scripts
│   ├── deploy.js           # Main deployment script
│   ├── deploy-rwa-token.js # Token deployment
│   ├── deploy-staking.js   # Staking deployment
│   ├── interact.js         # Usage examples
│   └── verify-deployment.js # Deployment verification
├── hardhat.config.js       # Hardhat configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Dependencies

- **Hardhat**: Development environment
- **OpenZeppelin**: Secure contract libraries
- **Ethers.js**: Ethereum interaction library
- **Chai**: Testing framework

---

**Built with ❤️ for the DeFi ecosystem**