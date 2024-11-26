"use client";
import { fetcher } from "@/lib/helper";
import { useSession } from "next-auth/react";
import React, { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";

interface WalletContextType {
  wallet: number;
  updateWallet: () => void;
  useWalletCredit: boolean;
  setUseWalletCredit: (useWalletCredit: boolean) => void;
}
interface WalletProviderProps {
  children: React.ReactNode;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [wallet, setWallet] = useState<number>(0);
  const [useWalletCredit, setUseWalletCredit] = useState<boolean>(false);
  const shouldFetch = session?.user?.role === "CUSTOMER";

  const { data, mutate } = useSWR(
    shouldFetch ? "/api/customer/wallet" : null,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );
  useEffect(() => {
    if (data?.data?.wallet) {
      setWallet(data.data.wallet);
    } else {
      setWallet(0);
    }
  }, [data]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        updateWallet: mutate,
        useWalletCredit,
        setUseWalletCredit,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
