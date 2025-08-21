'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function NewsRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="news" />
    </WhitelistGuard>
  )
}