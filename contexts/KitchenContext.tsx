"use client";
import { fetcher } from "@/lib/helper";
import { Kitchen } from "@prisma/client";
import React, { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
interface KitchensContextType {
  kitchens: Kitchen[];
  setKitchens: React.Dispatch<React.SetStateAction<Kitchen[]>>;
}
interface KitchensProviderProps {
  children: React.ReactNode;
}

const KitchensContext = createContext<KitchensContextType | undefined>(
  undefined
);

export const KitchensProvider: React.FC<KitchensProviderProps> = ({
  children,
}) => {
  const [kitchenList, setKitchenList] = useState<Kitchen[]>([]);

  const {
    data: kitchens,
    isLoading,
    error,
  } = useSWR("/api/dw?get=kitchens", fetcher, {
    revalidateOnFocus: false,
  });
  useEffect(() => {
    if (kitchens?.data) {
      setKitchenList(kitchens?.data || []);
    }
  }, [kitchens]);
  return (
    <KitchensContext.Provider
      value={{ kitchens: kitchenList, setKitchens: setKitchenList }}
    >
      {children}
    </KitchensContext.Provider>
  );
};

export const useKitchens = () => {
  const context = useContext(KitchensContext);
  if (context === undefined) {
    throw new Error("useKitchens must be used within a KitchensProvider");
  }
  return context;
};
