# W3E DeFi Platform Component Guide

## Overview

This guide provides comprehensive documentation for all components in the W3E DeFi Platform. It serves as a reference for developers working with the component library.

## Table of Contents

- [Component Architecture](#component-architecture)
- [Component Categories](#component-categories)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Component Architecture

### Design Principles

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: Components are designed to be used across different contexts
3. **Accessibility**: All components follow WCAG 2.1 guidelines
4. **Performance**: Optimized for minimal re-renders and bundle size
5. **Type Safety**: Full TypeScript support with comprehensive type definitions

### File Structure

```
components/
├── index.ts              # Main export file
├── types.ts              # Type definitions
├── test-utils.tsx        # Testing utilities
├── README.md             # Component overview
├── COMPONENT_GUIDE.md    # This file
├── core/                 # Core platform components
├── pages/                # Page-level components
├── modals/               # Modal components
├── guards/               # Authentication guards
├── wallet/               # Wallet-related components
├── layout/               # Layout components
├── cards/                # Card components
└── ui/                   # Basic UI components
```

## Component Categories

### 1. Core Platform Components

#### Web3W3EPlatform
- **Purpose**: Main application wrapper
- **Location**: `w3e-defi-platform.tsx`
- **Props**: See `Web3ProviderProps` in types.ts
- **Usage**: Root component for the entire platform

```tsx
import { Web3W3EPlatform } from '@/components';

<Web3W3EPlatform>
  {/* Your app content */}
</Web3W3EPlatform>
```

#### Web3Provider
- **Purpose**: Web3 context provider
- **Location**: `web3-provider.tsx`
- **Props**: `Web3ProviderProps`
- **Usage**: Provides Web3 functionality to child components

### 2. Page Components

#### Homepage
- **Purpose**: Landing page component
- **Location**: `homepage.tsx`
- **Props**: `PageComponentProps`
- **Features**: Hero section, features showcase, tokenized assets display

#### PortfolioPage
- **Purpose**: User portfolio dashboard
- **Location**: `portfolio-page.tsx`
- **Props**: `PageComponentProps`
- **Features**: Asset overview, performance metrics, transaction history

### 3. Modal Components

#### Web3StakingModal
- **Purpose**: Token staking interface
- **Location**: `web3-staking-modal.tsx`
- **Props**: `ModalProps & StakingModalProps`
- **Features**: Amount input, period selection, transaction handling

#### Web3UnstakeModal
- **Purpose**: Token unstaking interface
- **Location**: `web3-unstake-modal.tsx`
- **Props**: `ModalProps & UnstakeModalProps`
- **Features**: Confirmation, early unstake warnings, transaction processing

#### Web3ClaimModal
- **Purpose**: Reward claiming interface
- **Location**: `web3-claim-modal.tsx`
- **Props**: `ModalProps & ClaimModalProps`
- **Features**: Reward selection, batch claiming, transaction status

### 4. Authentication & Security

#### WhitelistGuard
- **Purpose**: Whitelist access control
- **Location**: `whitelist-guard.tsx`
- **Props**: `GuardProps`
- **Usage**: Wraps components requiring whitelist access

#### AdminGuard
- **Purpose**: Admin access control
- **Location**: `admin-guard.tsx`
- **Props**: `GuardProps`
- **Usage**: Protects admin-only functionality

### 5. Wallet Components

#### WalletStatus
- **Purpose**: Wallet connection status display
- **Location**: `wallet-status.tsx`
- **Props**: `WalletStatusProps`
- **Features**: Connection status, balance display, network info

### 6. Layout Components

#### Sidebar
- **Purpose**: Navigation sidebar
- **Location**: `layout/sidebar.tsx`
- **Props**: `SidebarProps`
- **Features**: Menu items, user info, responsive design

### 7. Card Components

#### TokenCard
- **Purpose**: Token information display
- **Location**: `cards/token-card.tsx`
- **Props**: `TokenCardProps`
- **Features**: Token details, price info, action buttons

### 8. UI Components

#### Button
- **Purpose**: Reusable button component
- **Location**: `ui/button.tsx`
- **Props**: `ButtonProps`
- **Variants**: primary, secondary, outline, ghost
- **Sizes**: sm, md, lg

#### Input
- **Purpose**: Form input component
- **Location**: `ui/input.tsx`
- **Props**: `InputProps`
- **Features**: Validation, error states, accessibility

#### Card
- **Purpose**: Container component
- **Location**: `ui/card.tsx`
- **Props**: `CardProps`
- **Features**: Flexible layout, responsive design

#### Textarea
- **Purpose**: Multi-line text input
- **Location**: `ui/textarea.tsx`
- **Props**: `TextareaProps`
- **Features**: Auto-resize, character count, validation

## Usage Patterns

### 1. Component Composition

```tsx
import { Card, Button, TokenCard } from '@/components';

function AssetGrid({ tokens }: { tokens: TokenInfo[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tokens.map((token) => (
        <TokenCard key={token.id} token={token} />
      ))}
    </div>
  );
}
```

### 2. Modal Usage

```tsx
import { Web3StakingModal } from '@/components';
import { useState } from 'react';

function StakingInterface() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Stake Tokens
      </Button>
      
      <Web3StakingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tokenAddress="0x..."
      />
    </>
  );
}
```

### 3. Guard Implementation

```tsx
import { WhitelistGuard } from '@/components';

function ProtectedContent() {
  return (
    <WhitelistGuard fallback={<div>Access denied</div>}>
      <div>Protected content here</div>
    </WhitelistGuard>
  );
}
```

## Best Practices

### 1. Component Development

- **Use TypeScript**: All components must have proper type definitions
- **Follow naming conventions**: PascalCase for components, camelCase for props
- **Implement error boundaries**: Handle errors gracefully
- **Add accessibility attributes**: ARIA labels, roles, and keyboard navigation
- **Optimize performance**: Use React.memo, useMemo, and useCallback when appropriate

### 2. Styling Guidelines

- **Use Tailwind CSS**: Consistent utility-first approach
- **Follow design system**: Use predefined colors, spacing, and typography
- **Responsive design**: Mobile-first approach with breakpoint utilities
- **Dark mode support**: Use CSS variables and theme-aware classes

### 3. State Management

- **Local state**: Use useState for component-specific state
- **Global state**: Use context or external state management for shared state
- **Server state**: Use React Query for API data management
- **Form state**: Use controlled components with proper validation

### 4. Testing

- **Unit tests**: Test component logic and rendering
- **Integration tests**: Test component interactions
- **Accessibility tests**: Ensure WCAG compliance
- **Visual regression tests**: Catch UI changes

## API Reference

### Common Props

All components extend these base props:

```tsx
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}
```

### Event Handlers

Standard event handler patterns:

```tsx
interface EventHandlers {
  onClick?: (event: React.MouseEvent) => void;
  onSubmit?: (event: React.FormEvent) => void;
  onChange?: (value: string) => void;
  onError?: (error: Error) => void;
}
```

### Web3 Props

Web3-related components use these props:

```tsx
interface Web3Props {
  tokenAddress?: string;
  chainId?: number;
  onTransactionStart?: (txHash: string) => void;
  onTransactionSuccess?: (txHash: string) => void;
  onTransactionError?: (error: Error) => void;
}
```

## Examples

### 1. Creating a Custom Token Display

```tsx
import { Card, Button } from '@/components';
import type { TokenInfo } from '@/components/types';

interface CustomTokenCardProps {
  token: TokenInfo;
  onStake: (tokenId: number) => void;
}

function CustomTokenCard({ token, onStake }: CustomTokenCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <img src={token.logo} alt={token.name} className="w-12 h-12" />
        <div>
          <h3 className="font-semibold">{token.name}</h3>
          <p className="text-sm text-gray-600">{token.symbol}</p>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span>Price:</span>
          <span className="font-medium">{token.price}</span>
        </div>
        <div className="flex justify-between">
          <span>APY:</span>
          <span className="font-medium text-green-600">{token.apy}%</span>
        </div>
      </div>
      
      <Button 
        onClick={() => onStake(token.id)}
        className="w-full"
      >
        Stake Now
      </Button>
    </Card>
  );
}
```

### 2. Building a Dashboard Layout

```tsx
import { Sidebar, Card } from '@/components';
import type { MenuItem } from '@/components/types';

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/' },
  { id: 'portfolio', label: 'Portfolio', icon: 'portfolio', href: '/portfolio' },
  { id: 'staking', label: 'Staking', icon: 'staking', href: '/staking' },
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        menuItems={menuItems}
        className="w-64 bg-white shadow-lg"
      />
      
      <main className="flex-1 overflow-auto p-6">
        <Card className="h-full">
          {children}
        </Card>
      </main>
    </div>
  );
}
```

### 3. Form with Validation

```tsx
import { Input, Button, Card } from '@/components';
import { useState } from 'react';

function StakingForm() {
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return 'Please enter a valid amount';
    }
    if (num > 1000) {
      return 'Amount cannot exceed 1000 tokens';
    }
    return '';
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountError = validateAmount(amount);
    if (amountError) {
      setErrors({ amount: amountError });
      return;
    }
    
    // Process staking
    console.log('Staking amount:', amount);
  };
  
  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Stake Tokens</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Amount to Stake"
          type="number"
          value={amount}
          onChange={setAmount}
          error={errors.amount}
          placeholder="Enter amount"
          required
        />
        
        <Button type="submit" className="w-full">
          Stake Tokens
        </Button>
      </form>
    </Card>
  );
}
```

## Troubleshooting

### Common Issues

#### 1. Component Not Rendering

**Problem**: Component appears blank or doesn't render

**Solutions**:
- Check if all required props are provided
- Verify import statements are correct
- Ensure component is wrapped in necessary providers
- Check browser console for errors

#### 2. Styling Issues

**Problem**: Component styling doesn't match design

**Solutions**:
- Verify Tailwind CSS is properly configured
- Check if custom CSS is conflicting
- Ensure responsive classes are applied correctly
- Test in different screen sizes

#### 3. Web3 Integration Issues

**Problem**: Web3 functionality not working

**Solutions**:
- Verify wallet is connected
- Check network configuration
- Ensure contract addresses are correct
- Verify user has sufficient gas/tokens

#### 4. Performance Issues

**Problem**: Components are slow or cause lag

**Solutions**:
- Use React.memo for expensive components
- Implement proper key props for lists
- Avoid unnecessary re-renders
- Optimize large datasets with virtualization

### Debug Tools

1. **React Developer Tools**: Inspect component props and state
2. **Browser DevTools**: Check console errors and network requests
3. **Lighthouse**: Analyze performance and accessibility
4. **Web3 DevTools**: Debug blockchain interactions

### Getting Help

1. Check this documentation first
2. Review component source code
3. Search existing issues in the repository
4. Create a detailed bug report with reproduction steps
5. Ask for help in team channels

## Contributing

When contributing new components:

1. Follow the established patterns and conventions
2. Add comprehensive TypeScript types
3. Include proper documentation
4. Write unit tests
5. Ensure accessibility compliance
6. Update this guide if needed

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Web3 Integration Guide](https://wagmi.sh/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Best Practices](https://testing-library.com/docs/)

---

*This guide is maintained by the development team. Please keep it updated as components evolve.*