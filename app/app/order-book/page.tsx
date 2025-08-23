'use client'

import { Web3W3EPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function OrderBookRoute() {
  return (
    <WhitelistGuard>
      <Web3W3EPlatform activeTab="order-book" />
    </WhitelistGuard>
  )
}