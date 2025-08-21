'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function AppPage() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="market-overview" />
    </WhitelistGuard>
  )
}