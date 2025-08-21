'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function InvestRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="invest" />
    </WhitelistGuard>
  )
}