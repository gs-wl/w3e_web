'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function DexRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="dex" />
    </WhitelistGuard>
  )
}