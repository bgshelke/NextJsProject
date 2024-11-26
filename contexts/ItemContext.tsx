"use client";
import { Item } from "@/types/main";
import React, { createContext, useContext, useState } from "react";
interface ItemsContextType {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}
interface ItemProviderProps {
  children: React.ReactNode;
  items: Item[];
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export const ItemProvider: React.FC<ItemProviderProps> = ({
  children,
  items,
}) => {
  const [itemList, setItemList] = useState<Item[]>(items || []);

  return (
    <ItemsContext.Provider value={{ items: itemList, setItems: setItemList }}>
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemsContext);
  if (context === undefined) {
    throw new Error("useItems must be used within a ItemsProvider");
  }
  return context;
};
