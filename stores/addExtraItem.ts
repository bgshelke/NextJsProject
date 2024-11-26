import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ExtraItem {
  orderId: string;
  setOrderId: (newOrderId: string) => void;
  isFutureOrder: boolean;
  setIsFutureOrder: (newIsFutureOrder: boolean) => void;
  clearExtraItem: () => void;
}
const useExtraItem = create<ExtraItem>()(
  persist(
    (set) => ({
      orderId: "",
      isFutureOrder: false,
      setOrderId: (newOrderId: string) => set({ orderId: newOrderId }),
      setIsFutureOrder: (newIsFutureOrder: boolean) =>
        set({ isFutureOrder: newIsFutureOrder }),
      clearExtraItem: () => sessionStorage.removeItem("set-extra-item"),
    }),
    {
      name: "set-extra-item",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useExtraItem;
