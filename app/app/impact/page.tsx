'use client'

import { Web3W3EPlatform } from '@/components'
import { AppAccessGuard } from '@/components/app-access-guard'

export default function ImpactRoute() {
  return (
    <AppAccessGuard>
      <Web3W3EPlatform activeTab="impact" />
    </AppAccessGuard>
  )
}