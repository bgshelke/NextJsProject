"use client";
import { fetcher } from "@/lib/helper";
import { MenuType } from "@/types/main";
import React, { createContext, useContext } from "react";
import useSWR from "swr";

interface DayMenuContextType {
  getMenuData: (date: string) => {
    menuData: any;
    isLoading: boolean;
    mutate: () => void;
  };
}

const DayMenuContext = createContext<DayMenuContextType | undefined>(undefined);

export const DayMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getMenuData = (date: string) => {
    const { data, mutate, isLoading } = useSWR(date ? `/api/menu/by-date?date=${date}` : null, fetcher, {
      revalidateOnFocus: false,
    });
    const menuData = data?.data as MenuType[] || [];

    return { menuData, isLoading, mutate };
  };

  return (
    <DayMenuContext.Provider value={{ getMenuData }}>
      {children}
    </DayMenuContext.Provider>
  );
};

export const useDayMenu = (date: string) => {
  const context = useContext(DayMenuContext);
  if (context === undefined) {
    throw new Error("useDayMenu must be used within a DayMenuProvider");
  }
  return context.getMenuData(date);
};
