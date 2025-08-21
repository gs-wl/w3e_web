'use client'

import { Web3RWAPlatform } from '@/components'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function AdminAppPage() {
  return (
    <WhitelistGuard>
      <Web3RWAPlatform activeTab="admin" />
    </WhitelistGuard>
  )
}