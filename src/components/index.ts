/**
 * @fileoverview Component exports for W3E DeFi Platform
 * @description Centralized export file for all React components
 * @version 1.0.0
 * @author W3E DeFi Team
 */

// =============================================================================
// CORE PLATFORM COMPONENTS
// =============================================================================

/**
 * Main platform component - Entry point for the W3E DeFi application
 */
export { default as Web3W3EPlatform } from './w3e-defi-platform';

/**
 * Web3 provider wrapper for blockchain connectivity
 */
export { Web3Provider } from './web3-provider';

// =============================================================================
// PAGE COMPONENTS
// =============================================================================

// Homepage component removed - app now defaults to /app route

/**
 * User portfolio dashboard showing assets and performance
 */
export { PortfolioPage } from './portfolio-page';

/**
 * Staking interface for earning rewards on W3E tokens
 */
export { default as StakingPage } from './staking-page';

/**
 * News page displaying Twitter/X posts and AI-powered W3E/DeFi news
 */
export { default as NewsPage } from './news-page';

/**
 * Enhanced dashboard page with trading charts, staking summary, and analytics
 */
export { default as DashboardPage } from './dashboard-page';

// =============================================================================
// MODAL COMPONENTS
// =============================================================================


/**
 * Web3-enabled claim modal with blockchain integration
 */
export { Web3ClaimModal } from './web3-claim-modal';

/**
 * Web3-enabled staking modal with smart contract interaction
 */
export { Web3StakingModal } from './web3-staking-modal';

/**
 * Web3-enabled unstaking modal with transaction handling
 */
export { Web3UnstakeModal } from './web3-unstake-modal';

// =============================================================================
// AUTHENTICATION & SECURITY
// =============================================================================

/**
 * Guard component for whitelist-only access
 */
export { WhitelistGuard } from './whitelist-guard';

/**
 * Guard component for admin-only access
 */
export { AdminGuard } from './admin-guard';

// =============================================================================
// WALLET COMPONENTS
// =============================================================================

/**
 * Wallet connection button with RainbowKit integration
 */
export { WalletConnectButton, CompactWalletButton } from './wallet-connect-button';

/**
 * Wallet status indicator showing connection state
 */
export { WalletStatus } from './wallet-status';

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

/**
 * Application sidebar with navigation menu
 */
export { Sidebar } from './layout/sidebar';

// =============================================================================
// CARD COMPONENTS
// =============================================================================

/**
 * Token card component for displaying W3E token information
 */
export { TokenCard } from './cards/token-card';

// =============================================================================
// UI COMPONENTS (Design System)
// =============================================================================

/**
 * Base button component with variants and sizes
 */
export { Button } from './ui/button';

/**
 * Card components for content containers
 */
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent
} from './ui/card';

/**
 * Input component for form fields
 */
export { Input } from './ui/input';

/**
 * Textarea component for multi-line text input
 */
export { Textarea } from './ui/textarea';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Re-export all component types for external use
 */
export type { ButtonProps } from './ui/button';
export type * from './types';

/**
 * Component type definitions
 */
export type {
  BaseComponentProps,
  BaseModalProps,
  StakingModalProps,
  ClaimModalProps,
  UnstakeModalProps,
  GuardProps,
  WhitelistGuardProps,
  AdminGuardProps,
  WalletConnectButtonProps,
  WalletStatusProps,
  TokenInfo,
  TokenCardProps,
  SidebarProps,
  InputProps,
  TextareaProps,
  Web3ProviderProps,
  // HomepageProps removed
  PortfolioPageProps,
  StakingPageProps,
  NewsPageProps,
  ThemeContextType,
  ModalComponents,
  GuardComponents,
  WalletComponents,
} from './types';

// =============================================================================
// COMPONENT GROUPS (for easier imports)
// =============================================================================

/**
 * All modal components grouped for convenience
 */
export const Modals = {
  Web3Claim: require('./web3-claim-modal').Web3ClaimModal,
  Web3Staking: require('./web3-staking-modal').Web3StakingModal,
  Web3Unstake: require('./web3-unstake-modal').Web3UnstakeModal,
} as const;

/**
 * All guard components grouped for convenience
 */
export const Guards = {
  Whitelist: require('./whitelist-guard').WhitelistGuard,
  Admin: require('./admin-guard').AdminGuard,
} as const;

/**
 * All wallet-related components grouped for convenience
 */
export const Wallet = {
  ConnectButton: require('./wallet-connect-button').WalletConnectButton,
  CompactButton: require('./wallet-connect-button').CompactWalletButton,
  Status: require('./wallet-status').WalletStatus,
} as const;

// =============================================================================
// DEVELOPMENT NOTES
// =============================================================================

/**
 * @todo Add Header component to layout
 * @todo Add Footer component to layout
 * @todo Add Navigation component to layout
 * @todo Implement loading states for all async components
 * @todo Add error boundary components
 * @todo Create reusable form components
 * @todo Add animation/transition components
 * @todo Implement accessibility features
 */

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/**
 * @example Basic component import
 * ```typescript
 * import { Button, Card } from '@/components';
 * ```
 *
 * @example Guard usage
 * ```typescript
 * import { Guards } from '@/components';
 * <Guards.Whitelist><YourComponent /></Guards.Whitelist>
 * ```
 */