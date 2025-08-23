'use client'

import { Web3W3EPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function GovernanceRoute() {
  return (
    <WhitelistGuard>
      <Web3W3EPlatform activeTab="governance" />
    </WhitelistGuard>
  )
}