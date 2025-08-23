/**
 * @fileoverview Type definitions for W3E DeFi Platform components
 * @description Centralized type definitions for component props and interfaces
 * @version 1.0.0
 */

import { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

// =============================================================================
// BASE COMPONENT TYPES
// =============================================================================

/**
 * Base props that all components should extend
 */
export interface BaseComponentProps {
  /** Additional CSS classes */
  className?: string;
  /** Component children */
  children?: ReactNode;
  /** Test ID for testing purposes */
  testId?: string;
}

/**
 * Props for components that can be disabled
 */
export interface DisableableProps {
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Props for components with loading states
 */
export interface LoadingProps {
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Loading text to display */
  loadingText?: string;
}

// =============================================================================
// MODAL COMPONENT TYPES
// =============================================================================

/**
 * Base props for all modal components
 */
export interface BaseModalProps extends BaseComponentProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Whether to close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Whether to close on escape key */
  closeOnEscape?: boolean;
}

/**
 * Props for staking-related modals
 */
export interface StakingModalProps extends BaseModalProps {
  /** Selected asset symbol */
  selectedAsset?: string;
  /** Callback when staking is successful */
  onStakingSuccess?: (txHash: string) => void;
}

/**
 * Props for claim rewards modal
 */
export interface ClaimModalProps extends BaseModalProps {
  /** Pre-selected assets to claim */
  selectedAssets?: string[];
  /** Callback when claiming is successful */
  onClaimSuccess?: (txHash: string) => void;
}

/**
 * Props for unstake modal
 */
export interface UnstakeModalProps extends BaseModalProps {
  /** Selected stake ID to unstake */
  selectedStakeId?: bigint;
  /** Callback when unstaking is successful */
  onUnstakeSuccess?: (txHash: string) => void;
}

// =============================================================================
// GUARD COMPONENT TYPES
// =============================================================================

/**
 * Props for guard components
 */
export interface GuardProps extends BaseComponentProps {
  /** Fallback component to render when access is denied */
  fallback?: ReactNode;
  /** Redirect path when access is denied */
  redirectTo?: string;
}

/**
 * Props for whitelist guard
 */
export interface WhitelistGuardProps extends GuardProps {
  /** Whether to show loading state while checking whitelist */
  showLoading?: boolean;
}

/**
 * Props for admin guard
 */
export interface AdminGuardProps extends GuardProps {
  /** Required admin level */
  requiredLevel?: 'admin' | 'super_admin';
}

// =============================================================================
// WALLET COMPONENT TYPES
// =============================================================================

/**
 * Props for wallet connect button
 */
export interface WalletConnectButtonProps extends BaseComponentProps, DisableableProps {
  /** Button variant */
  variant?: 'default' | 'compact' | 'minimal';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show account info when connected */
  showAccount?: boolean;
  /** Custom connect text */
  connectText?: string;
}

/**
 * Props for wallet status component
 */
export interface WalletStatusProps extends BaseComponentProps {
  /** Whether to show detailed information */
  detailed?: boolean;
  /** Whether to show balance information */
  showBalance?: boolean;
  /** Whether to show network information */
  showNetwork?: boolean;
}

// =============================================================================
// CARD COMPONENT TYPES
// =============================================================================

/**
 * Token information interface
 */
export interface TokenInfo {
  id: number;
  symbol: string;
  name: string;
  type: string;
  tvl: string;
  apy: string;
  price: string;
  change24h: string;
  marketCap: string;
  liquidity: string;
  chain: string;
  verified: boolean;
  yieldType: string;
  nextReward: string;
  holders: number;
  logo?: string;
}

/**
 * Props for token card component
 */
export interface TokenCardProps extends BaseComponentProps {
  /** Token information */
  token: TokenInfo;
  /** Whether the card is selected */
  selected?: boolean;
  /** Callback when card is clicked */
  onClick?: (token: TokenInfo) => void;
  /** Callback when stake button is clicked */
  onStake?: (token: TokenInfo) => void;
  /** Callback when trade button is clicked */
  onTrade?: (token: TokenInfo) => void;
  /** Whether to show action buttons */
  showActions?: boolean;
}

// =============================================================================
// LAYOUT COMPONENT TYPES
// =============================================================================

/**
 * Menu item interface
 */
export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  href?: string;
  onClick?: () => void;
}

/**
 * Menu section interface
 */
export interface MenuSection {
  category: string;
  items: MenuItem[];
}

/**
 * Props for sidebar component
 */
export interface SidebarProps extends BaseComponentProps {
  /** Whether sidebar is open */
  sidebarOpen: boolean;
  /** Function to set sidebar open state */
  setSidebarOpen: (open: boolean) => void;
  /** Function to set user toggled state */
  setUserToggledSidebar: (toggled: boolean) => void;
  /** Active tab ID */
  activeTab: string;
  /** Function to set active tab */
  setActiveTab: (tab: string) => void;
  /** Menu items */
  menuItems?: MenuSection[];
}

// =============================================================================
// FORM COMPONENT TYPES
// =============================================================================

/**
 * Base input props
 */
export interface BaseInputProps extends BaseComponentProps, DisableableProps {
  /** Input value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
}

/**
 * Props for input component
 */
export interface InputProps extends BaseInputProps {
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Left icon */
  leftIcon?: LucideIcon;
  /** Right icon */
  rightIcon?: LucideIcon;
  /** Whether to show clear button */
  clearable?: boolean;
}

/**
 * Props for textarea component
 */
export interface TextareaProps extends BaseInputProps {
  /** Number of rows */
  rows?: number;
  /** Whether to auto-resize */
  autoResize?: boolean;
  /** Maximum number of characters */
  maxLength?: number;
}

// =============================================================================
// BUTTON COMPONENT TYPES
// =============================================================================

/**
 * Button variants
 */
export type ButtonVariant = 
  | 'default' 
  | 'destructive' 
  | 'outline' 
  | 'secondary' 
  | 'ghost' 
  | 'link';

/**
 * Button sizes
 */
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Props for button component
 */
export interface ButtonProps 
  extends BaseComponentProps, 
          DisableableProps, 
          LoadingProps,
          ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Left icon */
  leftIcon?: LucideIcon;
  /** Right icon */
  rightIcon?: LucideIcon;
  /** Whether button is full width */
  fullWidth?: boolean;
}

// =============================================================================
// WEB3 COMPONENT TYPES
// =============================================================================

/**
 * Staking period interface
 */
export interface StakingPeriod {
  days: number;
  label: string;
  multiplier: number;
}

/**
 * Stake information interface
 */
export interface StakeInfo {
  id: bigint;
  token: string;
  amount: bigint;
  rewards: bigint;
  startTime: bigint;
  endTime: bigint;
  claimed: boolean;
}

/**
 * Transaction status
 */
export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Props for Web3 provider
 */
export interface Web3ProviderProps extends BaseComponentProps {
  /** Theme preference */
  theme?: 'light' | 'dark';
  /** Custom RPC URLs */
  rpcUrls?: Record<number, string>;
}

// =============================================================================
// PAGE COMPONENT TYPES
// =============================================================================

// Homepage props removed - app now defaults to /app route

/**
 * Props for portfolio page component
 */
export interface PortfolioPageProps extends BaseComponentProps {
  /** User address to show portfolio for */
  userAddress?: string;
  /** Whether to show detailed view */
  detailed?: boolean;
}

/**
 * Props for staking page component
 */
export interface StakingPageProps extends BaseComponentProps {
  /** Default selected asset */
  defaultAsset?: string;
  /** Whether to show analytics */
  showAnalytics?: boolean;
}

/**
 * Props for news page component
 */
export interface NewsPageProps extends BaseComponentProps {
  /** Default active tab */
  defaultTab?: 'all' | 'blog' | 'twitter' | 'ai-news';
  /** Whether to show trending content first */
  showTrending?: boolean;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Theme context type
 */
export interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

/**
 * Component ref types
 */
export type ComponentRef<T = HTMLElement> = React.RefObject<T>;

/**
 * Event handler types
 */
export type ClickHandler = (event: React.MouseEvent) => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type SubmitHandler = (event: React.FormEvent) => void;

/**
 * Animation states
 */
export type AnimationState = 'enter' | 'exit' | 'idle';

/**
 * Loading states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// =============================================================================
// COMPONENT GROUPS
// =============================================================================

/**
 * Modal components group
 */
export interface ModalComponents {
  StakingActivation: React.ComponentType<StakingModalProps>;
  ClaimRewards: React.ComponentType<ClaimModalProps>;
  Unstake: React.ComponentType<UnstakeModalProps>;
  Web3Claim: React.ComponentType<ClaimModalProps>;
  Web3Staking: React.ComponentType<StakingModalProps>;
  Web3Unstake: React.ComponentType<UnstakeModalProps>;
}

/**
 * Guard components group
 */
export interface GuardComponents {
  Whitelist: React.ComponentType<WhitelistGuardProps>;
  Admin: React.ComponentType<AdminGuardProps>;
}

/**
 * Wallet components group
 */
export interface WalletComponents {
  ConnectButton: React.ComponentType<WalletConnectButtonProps>;
  CompactButton: React.ComponentType<WalletConnectButtonProps>;
  Status: React.ComponentType<WalletStatusProps>;
}

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

export type {
  // Re-export commonly used React types
  ReactNode,
  ButtonHTMLAttributes,
  HTMLAttributes,
};

// Default export for convenience
export default {
  // Type guards and utilities can be added here
};