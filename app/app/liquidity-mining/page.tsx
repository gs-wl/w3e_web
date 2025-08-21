'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function LiquidityMiningRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="liquidity-mining" />
    </WhitelistGuard>
  )
}