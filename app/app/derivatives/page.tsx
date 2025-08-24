'use client'

import { Web3W3EPlatform } from '@/components'
import { AppAccessGuard } from '@/components/app-access-guard'

export default function DerivativesRoute() {
  return (
    <AppAccessGuard>
      <Web3W3EPlatform activeTab="derivatives" />
    </AppAccessGuard>
  )
}