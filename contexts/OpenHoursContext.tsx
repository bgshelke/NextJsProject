"use client";
import { OpenHours } from "@prisma/client";
import React, { createContext, useContext } from "react";

interface OpenHoursContextType {
  openHours: OpenHours[] | null;
}
interface OpenHoursProviderProps {
  children: React.ReactNode;
  openHours: OpenHours[] | null;
}

const OpenHoursContext = createContext<OpenHoursContextType | undefined>(
  undefined
);

export const OpenHoursProvider: React.FC<OpenHoursProviderProps> = ({
  children,
  openHours,
}) => {
  
  return (
    <OpenHoursContext.Provider value={{ openHours }}>
      {children}
    </OpenHoursContext.Provider>
  );
};

export const useOpenHours = () => {
  const context = useContext(OpenHoursContext);
  if (context === undefined) {
    throw new Error("useOpenHours must be used within a OpenHoursProvider");
  }
  return context;
};
