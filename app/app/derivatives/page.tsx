'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function DerivativesRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="derivatives" />
    </WhitelistGuard>
  )
}