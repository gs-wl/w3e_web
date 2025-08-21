'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

export function TestnetHeader() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm sm:text-base font-medium">
            <span className="text-lg sm:text-xl">🟡</span>
            <span className="hidden sm:inline">Sepolia Testnet — v1.0 (Demo Only)</span>
            <span className="sm:hidden">Sepolia Testnet — Demo</span>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
          aria-label="Close testnet notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}