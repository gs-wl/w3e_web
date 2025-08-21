# Web3 Integration Setup Guide

This guide will help you set up the Web3 wallet integration using RainbowKit and Viem for the RWA.defi platform.

## Prerequisites

1. Node.js 18+ installed
2. A WalletConnect Project ID
3. Deployed smart contracts (optional for development)

## Installation

The following packages have been integrated:

```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

## Configuration

### 1. Environment Variables

Copy `.env.example` to `.env.local` and update the following variables:

```bash
# Required: Get from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id_here"

# Optional: Update with your deployed contract addresses
NEXT_PUBLIC_ETHEREUM_STAKING_CONTRACT="0x..."
NEXT_PUBLIC_POLYGON_STAKING_CONTRACT="0x..."
# ... etc
```

### 2. WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID
4. Add it to your `.env.local` file

## Features Implemented

### 🔗 Wallet Connection
- **RainbowKit Integration**: Beautiful wallet connection modal
- **Multi-chain Support**: Ethereum, Polygon, Arbitrum, Base
- **Responsive Design**: Works on desktop and mobile
- **Theme Support**: Light/dark mode compatible

### 💰 Staking Features
- **Token Staking**: Stake supported tokens with different periods
- **Real-time Balances**: Display actual wallet balances
- **Approval Flow**: Handle token approvals before staking
- **Transaction Status**: Real-time transaction feedback

### 🎁 Rewards Management
- **Claim Rewards**: Claim staking rewards from matured stakes
- **Bulk Operations**: Select multiple stakes for batch claiming
- **Reward Calculation**: Real-time reward calculations

### 🔓 Unstaking
- **Flexible Unstaking**: Unstake tokens when matured
- **Early Unstaking**: Warning system for early unstaking
- **Principal + Rewards**: Receive both principal and earned rewards

## Components Overview

### Core Components

1. **Web3Provider** (`src/components/web3-provider.tsx`)
   - Wraps the app with Web3 providers
   - Configures RainbowKit theme
   - Manages query client

2. **WalletConnectButton** (`src/components/wallet-connect-button.tsx`)
   - Custom wallet connection button
   - Responsive design (full + compact versions)
   - Account display with balance

3. **WalletStatus** (`src/components/wallet-status.tsx`)
   - Displays wallet balances and staking overview
   - Real-time data from blockchain
   - Token balance breakdown

### Web3 Modals

1. **Web3StakingModal** (`src/components/web3-staking-modal.tsx`)
   - Stake tokens with approval flow
   - Period selection with multipliers
   - Estimated rewards calculation

2. **Web3ClaimModal** (`src/components/web3-claim-modal.tsx`)
   - Claim rewards from matured stakes
   - Bulk selection support
   - Transaction confirmation

3. **Web3UnstakeModal** (`src/components/web3-unstake-modal.tsx`)
   - Unstake tokens and claim rewards
   - Early unstaking warnings
   - Principal + rewards display

### Hooks

1. **useStaking** (`src/hooks/useStaking.ts`)
   - Smart contract interactions
   - Token balance queries
   - Staking operations (stake, unstake, claim)

## Smart Contract Integration

### Contract ABIs
The following ABIs are included:
- **ERC20**: For token operations (approve, balance, allowance)
- **Staking Contract**: For staking operations
- **Rewards Contract**: For reward management

### Supported Operations
- `approve()`: Approve token spending
- `stake()`: Stake tokens for a period
- `unstake()`: Unstake tokens and claim rewards
- `claimRewards()`: Claim pending rewards
- `getUserStakes()`: Get user's active stakes
- `getPendingRewards()`: Get claimable rewards

## Configuration Files

### Web3 Config (`src/lib/web3-config.ts`)
- Chain configurations
- Contract addresses
- Supported tokens
- RainbowKit setup

### Layout Integration (`app/layout.tsx`)
- Web3Provider wrapper
- Global Web3 context

## Usage Examples

### Basic Wallet Connection
```tsx
import { WalletConnectButton } from '@/components/wallet-connect-button';

function Header() {
  return (
    <div>
      <WalletConnectButton />
    </div>
  );
}
```

### Using Staking Hook
```tsx
import { useStaking } from '@/hooks/useStaking';

function StakingComponent() {
  const { stakeTokens, isLoading, error } = useStaking();
  
  const handleStake = async () => {
    try {
      await stakeTokens('ADA', '100', 90); // Stake 100 ADA for 90 days
    } catch (err) {
      console.error('Staking failed:', err);
    }
  };
  
  return (
    <button onClick={handleStake} disabled={isLoading}>
      {isLoading ? 'Staking...' : 'Stake Tokens'}
    </button>
  );
}
```

## Development Notes

### Testing Without Contracts
The app will work without deployed contracts, but will show:
- Zero balances
- No staking data
- Transaction failures

### Adding New Tokens
1. Update `SUPPORTED_TOKENS` in `src/lib/web3-config.ts`
2. Add token addresses for each chain
3. Add environment variables in `.env.example`

### Adding New Chains
1. Import chain from `wagmi/chains`
2. Add to `chains` array in config
3. Update contract addresses mapping
4. Add token addresses for new chain

## Troubleshooting

### Common Issues

1. **"Project ID not found"**
   - Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set
   - Verify the Project ID is correct

2. **"Contract not found"**
   - Check contract addresses in environment variables
   - Ensure you're on the correct network

3. **"Insufficient allowance"**
   - User needs to approve token spending first
   - The approval flow should handle this automatically

4. **"Transaction failed"**
   - Check gas fees and wallet balance
   - Verify contract addresses are correct
   - Ensure user is on the correct network

### Debug Mode
Set `NEXT_PUBLIC_DEBUG="true"` in your environment to enable additional logging.

## Security Considerations

1. **Never commit private keys** to version control
2. **Validate all user inputs** before sending transactions
3. **Use environment variables** for sensitive configuration
4. **Test thoroughly** on testnets before mainnet deployment
5. **Implement proper error handling** for all Web3 operations

## Next Steps

1. Deploy smart contracts to your chosen networks
2. Update contract addresses in environment variables
3. Test the integration on testnets
4. Configure proper token addresses
5. Set up monitoring and analytics
6. Implement additional features like governance voting

## Support

For issues related to:
- **RainbowKit**: [RainbowKit Documentation](https://rainbowkit.com/)
- **Wagmi**: [Wagmi Documentation](https://wagmi.sh/)
- **Viem**: [Viem Documentation](https://viem.sh/)
- **WalletConnect**: [WalletConnect Documentation](https://docs.walletconnect.com/)