'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function YieldFarmingRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="yield-farming" />
    </WhitelistGuard>
  )
}