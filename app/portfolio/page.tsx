'use client'

import { PortfolioPage } from '@/components/portfolio-page'
import { WhitelistGuard } from '@/components/whitelist-guard'

export default function Portfolio() {
  return (
    <WhitelistGuard>
      <PortfolioPage />
    </WhitelistGuard>
  )
}