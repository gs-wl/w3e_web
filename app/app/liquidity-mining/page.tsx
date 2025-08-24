'use client'

import { Web3W3EPlatform } from '@/components'
import { AppAccessGuard } from '@/components/app-access-guard'

export default function LiquidityMiningRoute() {
  return (
    <AppAccessGuard>
      <Web3W3EPlatform activeTab="liquidity-mining" />
    </AppAccessGuard>
  )
}