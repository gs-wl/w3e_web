# Dashboard Components

This directory contains professional dashboard components for the W3-Energy W3E DeFi platform, inspired by modern crypto trading interfaces.

## Components Overview

### 1. TradingChart
- **Purpose**: Displays price charts with timeframe controls
- **Features**: 
  - Multiple timeframe selection (1H, 1D, 1W, 1M)
  - Price display with percentage change
  - Responsive design
  - Placeholder for chart library integration

### 2. UserStakingSummary
- **Purpose**: Shows user's staking statistics and rewards
- **Features**:
  - Total staked amount
  - Total rewards earned
  - Personal APY
  - Manage stake button

### 3. AssetPerformancePieChart
- **Purpose**: Visual representation of asset allocation
- **Features**:
  - Interactive pie chart
  - Asset selection
  - Percentage breakdown
  - Color-coded legend

### 4. EcosystemSummary
- **Purpose**: Tabular view of ecosystem pools and performance
- **Features**:
  - Filterable table
  - Pool information
  - APY display
  - Duration tracking

### 5. RecentUpdatesNews
- **Purpose**: News and updates feed with multiple sources
- **Features**:
  - Tabbed interface (Blog, Twitter, AI News)
  - Time-based updates
  - Icon-based categorization
  - Scrollable feed

## Usage

```tsx
import { 
  TradingChart, 
  UserStakingSummary, 
  AssetPerformancePieChart,
  EcosystemSummary,
  RecentUpdatesNews 
} from '@/components/dashboard';

// Use in your dashboard layout
<TradingChart currentPrice="$45,678.90" priceChange="2.54%" isPositive={true} />
```

## Integration Notes

- All components support dark/light theme
- Responsive design for mobile and desktop
- TypeScript interfaces for type safety
- Modular and reusable architecture

## Future Enhancements

- Real-time data integration
- Chart library implementation (TradingView, Chart.js)
- WebSocket connections for live updates
- Advanced filtering and sorting
- Export functionality