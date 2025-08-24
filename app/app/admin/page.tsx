'use client'

import { Web3W3EPlatform } from '@/components'
import { AdminGuard } from '@/components/admin-guard'

export default function AdminAppPage() {
  return (
    <AdminGuard>
      <Web3W3EPlatform activeTab="admin" />
    </AdminGuard>
  )
}