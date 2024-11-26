import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AdditionalDays {
  date: Date;
  orderId: string;
  isUpcoming: boolean;
  setDate: (newDate: Date) => void;
  setOrderId: (newOrderId: string) => void;
  clearFinalOrder: () => void;
  setIsUpcoming: (newIsUpcoming: boolean) => void;
}
const useAdditionalDays = create<AdditionalDays>()(
  persist(
    (set) => ({
      date: new Date(),
      setDate: (newDate: Date) => set({ date: newDate }),
      orderId: "",
      setOrderId: (newOrderId: string) => set({ orderId: newOrderId }),
      clearFinalOrder: () => sessionStorage.removeItem("add-day"),
      isUpcoming: false,
      setIsUpcoming: (newIsUpcoming: boolean) => set({ isUpcoming: newIsUpcoming }),
    }),
    {
      name: "add-day",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAdditionalDays;
