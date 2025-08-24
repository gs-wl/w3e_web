import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/components/web3-provider'
import { ThemeProvider } from '@/contexts/theme-context'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' }
  ],
}

export const metadata: Metadata = {
  title: 'W3-Energy - Real World Assets DeFi Platform',
  description: 'Trade, stake, and invest in tokenized real-world assets including renewable energy, carbon credits, and green bonds.',
  keywords: 'RWA, DeFi, Real World Assets, Tokenization, Renewable Energy, Carbon Credits, Green Finance',
  authors: [{ name: 'W3-Energy Team' }],
  openGraph: {
    title: 'W3-Energy - Real World Assets DeFi Platform',
    description: 'Trade, stake, and invest in tokenized real-world assets',
    type: 'website',
    locale: 'en_US',
    images: ['/logo/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'W3-Energy - Real World Assets DeFi Platform',
    description: 'Trade, stake, and invest in tokenized real-world assets',
    images: ['/logo/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo/favicon.png" />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-V182YLWBQV"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-V182YLWBQV');
            `,
          }}
        />
        {/* Start of HubSpot Embed Code */}
        <script type="text/javascript" id="hs-script-loader" async defer src="//js-na2.hs-scripts.com/243507438.js"></script>
        {/* End of HubSpot Embed Code */}
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <Web3Provider>
            {children}
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}