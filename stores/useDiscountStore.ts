import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DiscountStore {
  discountType: string;
  discountValue: number;
  couponCode: string;
  couponApplied: boolean;
  setCouponData: (code: string, type: string, value: number) => void;
  removeDiscount: () => void;
}

export const useDiscountStore = create<DiscountStore>()(
  persist(
    (set) => ({
      discountType: "amount",
      discountValue: 0,
      couponCode: "",
      couponApplied: false,
      setCouponData: (code: string, type: string, value: number) =>
        set({
          couponCode: code,
          discountType: type,
          discountValue: value,
          couponApplied: true,
        }),
      removeDiscount: () => {
        set({
          couponCode: "",
          discountType: "amount",
          discountValue: 0,
          couponApplied: false,
        });
        sessionStorage.removeItem("getDiscount");
      },
    }),
    {
      name: "getDiscount",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
