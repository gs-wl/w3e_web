'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function TokenizedAssetsRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="tokenized-assets" />
    </WhitelistGuard>
  )
}