"use client";
import { DwConfig } from "@prisma/client";
import React, { createContext, useContext } from "react";

interface DwConfigContextType {
  dwConfig: DwConfig | null;
}
interface DwConfigProviderProps {
  children: React.ReactNode;
  dwConfig: DwConfig | null;
}

const DwConfigContext = createContext<DwConfigContextType | undefined>(
  undefined
);

export const DwConfigProvider: React.FC<DwConfigProviderProps> = ({
  children,
  dwConfig: dwConfigValue,
}) => {
  const defualtValue = {
    ...dwConfigValue,
    minQtyOfItem: dwConfigValue?.minQtyOfItem || 0,
    maxQtyOfItem: dwConfigValue?.maxQtyOfItem || 8,
    menuLoop: dwConfigValue?.menuLoop || 5,
    deliveryFees: dwConfigValue?.deliveryFees || 5,
    maxAmountForFreeDelivery: dwConfigValue?.maxAmountForFreeDelivery || 100,
    timeForPreparing: dwConfigValue?.timeForPreparing || 4,
    disableActionAndEmailToSend:
      dwConfigValue?.disableActionAndEmailToSend || 48,
      timeToStopAction: dwConfigValue?.timeToStopAction || "20:00"
  } as DwConfig;



  return (
    <DwConfigContext.Provider value={{ dwConfig: defualtValue }}>
      {children}
    </DwConfigContext.Provider>
  );
};

export const useDwConfig = () => {
  const context = useContext(DwConfigContext);
  if (context === undefined) {
    throw new Error("useDwConfig must be used within a DwConfigProvider");
  }
  return context;
};
