'use client'

import { PortfolioPage } from '@/components/portfolio-page'
import { AppAccessGuard } from '@/components/app-access-guard'

export default function Portfolio() {
  return (
    <AppAccessGuard>
      <PortfolioPage />
    </AppAccessGuard>
  )
}