# Smart Contract ABIs

This directory contains the Application Binary Interfaces (ABIs) for our deployed smart contracts.

## 📁 Structure

```
src/abi/
├── tokens/
│   ├── W3eToken.json          # W3E Token ABI (ERC20 with advanced features)
│   └── ERC20Token.json        # Generic ERC20 ABI (for reference)
└── staking/
    └── Staking.json           # Multi Pool Staking Contract ABI
```

## 🔗 Deployed Contracts (Sepolia Testnet)

### W3E Token
- **Address**: `0x5cfeEc46ABeD58db87a1e2e1873efeecE26a6484`
- **ABI File**: `src/abi/tokens/W3eToken.json`
- **Etherscan**: https://sepolia.etherscan.io/address/0x5cfeEc46ABeD58db87a1e2e1873efeecE26a6484

### Multi Pool Staking
- **Address**: `0x3c122D7571F76a32bE8dbC33255E97156f3A9576`
- **ABI File**: `src/abi/staking/Staking.json`
- **Etherscan**: https://sepolia.etherscan.io/address/0x3c122D7571F76a32bE8dbC33255E97156f3A9576

## 🛠️ Usage

### Import ABIs in your components:

```typescript
import W3eTokenABI from '@/abi/tokens/W3eToken.json';
import StakingABI from '@/abi/staking/Staking.json';
```

### Use with wagmi hooks:

```typescript
import { useContractRead, useContractWrite } from 'wagmi';

// Read contract data
const { data: balance } = useContractRead({
  address: '0x5cfeEc46ABeD58db87a1e2e1873efeecE26a6484',
  abi: W3eTokenABI,
  functionName: 'balanceOf',
  args: [userAddress],
});

// Write to contract
const { write: stake } = useContractWrite({
  address: '0x3c122D7571F76a32bE8dbC33255E97156f3A9576',
  abi: StakingABI,
  functionName: 'stake',
});
```

### Use with our custom hooks:

```typescript
import { useTokenBalance, useStake } from '@/hooks/useContracts';

// Get token balance
const { data: balance, isLoading } = useTokenBalance(userAddress);

// Stake tokens
const { write: stake, isLoading: isStaking } = useStake();
```

## 🔄 Updating ABIs

When contracts are redeployed or updated:

1. **Extract new ABIs** from compiled contracts:
   ```bash
   cd contracts
   node -e "const artifact = require('./artifacts/staking/W3eToken.sol/W3EToken.json'); console.log(JSON.stringify(artifact.abi, null, 2));" > ../src/abi/tokens/W3eToken.json
   node -e "const artifact = require('./artifacts/staking/Staking.sol/MultiPoolStaking.json'); console.log(JSON.stringify(artifact.abi, null, 2));" > ../src/abi/staking/Staking.json
   ```

2. **Update contract addresses** in:
   - `src/config/contracts.ts`
   - `.env` file
   - `src/hooks/useContracts.ts`

3. **Test the integration** with the new contracts

## 📋 Contract Functions

### W3E Token (ERC20 + Advanced Features)

#### Read Functions
- `name()` - Token name
- `symbol()` - Token symbol  
- `decimals()` - Token decimals (18)
- `totalSupply()` - Current total supply
- `balanceOf(address)` - Balance of address
- `allowance(owner, spender)` - Allowance amount
- `getVotes(address)` - Voting power
- `getPastVotes(address, blockNumber)` - Historical voting power

#### Write Functions
- `transfer(to, amount)` - Transfer tokens
- `approve(spender, amount)` - Approve spending
- `transferFrom(from, to, amount)` - Transfer from approved amount
- `mint(to, amount)` - Mint new tokens (owner only)
- `burn(amount)` - Burn tokens
- `delegate(delegatee)` - Delegate voting power

#### Admin Functions
- `setTransferFee(fee, collector)` - Set transfer fees
- `setBlacklisted(account, status)` - Blacklist addresses
- `pause()` / `unpause()` - Emergency controls
- `setAuthorizedMinter(minter, status)` - Manage minters

### Multi Pool Staking

#### Read Functions
- `poolCount()` - Number of pools
- `getPoolInfo(poolId)` - Pool information
- `getUserInfo(poolId, user)` - User staking info
- `pendingRewards(poolId, user)` - Pending rewards
- `getAllPools()` - All pool information
- `getUserStakedPools(user)` - User's active pools

#### Write Functions
- `stake(poolId, amount)` - Stake tokens
- `unstake(poolId, amount)` - Unstake tokens
- `claimRewards(poolId)` - Claim rewards
- `emergencyUnstake(poolId)` - Emergency unstake with fee

#### Admin Functions
- `addPool(token, maxStake, minStake, rewardRate, lockPeriod)` - Add new pool
- `updatePool(poolId, ...)` - Update pool parameters
- `setEmergencyWithdrawFee(fee)` - Set emergency fee
- `pause()` / `unpause()` - Emergency controls

## 🔐 Security Notes

- All ABIs are extracted from verified contracts on Etherscan
- Contract addresses are hardcoded to prevent address injection attacks
- Always verify contract addresses before interacting
- Use the provided hooks for additional safety checks

## 📚 Resources

- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [Contract Source Code](../contracts/)

---

*Last updated: July 29, 2025*