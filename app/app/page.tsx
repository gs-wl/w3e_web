'use client'

import { Web3W3EPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function AppPage() {
  return (
    <WhitelistGuard>
      <Web3W3EPlatform activeTab="market-overview" />
    </WhitelistGuard>
  )
}