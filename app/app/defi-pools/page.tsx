'use client'

import { Web3W3EPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function DeFiPoolsRoute() {
  return (
    <WhitelistGuard>
      <Web3W3EPlatform activeTab="defi-pools" />
    </WhitelistGuard>
  )
}