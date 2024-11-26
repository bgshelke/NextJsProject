"use client";
import { useWallet } from '@/contexts/WalletContext';
import React from 'react'
function WalletAmount() {
  const { wallet } = useWallet();
  return (
  <p className="text-lg font-semibold text-primary">
    {Number(wallet).toFixed(2) || 0}
  </p>
  )
}

export default WalletAmount