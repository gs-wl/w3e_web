'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function OrderBookRoute() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="order-book" />
    </WhitelistGuard>
  )
}