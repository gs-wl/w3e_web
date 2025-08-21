'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function GovernanceRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="governance" />
    </WhitelistGuard>
  )
}