import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BillingInfo, ShippingInfo } from "@/types/main";
import CryptoJS from "crypto-js";

interface UseDeliveryInfo {
  addressInfo: {
    shippingInfo: ShippingInfo;
    billingInfo: BillingInfo;
  };
  addressId: string | null;
  saveAddressForLater: boolean;
  setShippingInfo: (newShippingInfo: ShippingInfo) => void;
  setBillingInfo: (newBillingInfo: BillingInfo) => void;
  setAddressId: (newId: string) => void;
  setSaveAddressForLater: (newSaveAddressForLater: boolean) => void;
  clearShippingInfo: () => void;
  clearBillingInfo: () => void;
  clearDeliveryInfo: () => void;
}

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY as string;

const encryptData = (data: any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

const decryptData = (encryptedData: string) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

const secureStorage = {
  getItem: (key: string) => {
    const item = localStorage.getItem(key);
    return item ? decryptData(item) : null;
  },
  setItem: (key: string, value: any) => {
    localStorage.setItem(key, encryptData(value));
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};

const useDeliveryInfo = create<UseDeliveryInfo>()(
  persist(
    (set) => ({
      saveAddressForLater: false,
      addressInfo: {
        shippingInfo: {},
        billingInfo: {},
      },
      addressId: null,
      setAddressId: (newId: string) => set({ addressId: newId }),
      setSaveAddressForLater: (newSaveAddressForLater: boolean) =>
        set({ saveAddressForLater: newSaveAddressForLater }),
      setShippingInfo: (newShippingInfo: ShippingInfo) =>
        set((state) => ({
          addressInfo: { ...state.addressInfo, shippingInfo: newShippingInfo },
        })),
      setBillingInfo: (newBillingInfo: BillingInfo) =>
        set((state) => ({
          addressInfo: { ...state.addressInfo, billingInfo: newBillingInfo },
        })),
      clearShippingInfo: () =>
        set((state) => ({
          addressInfo: {
            ...state.addressInfo,
            shippingInfo: {},
          },
        })),
      clearBillingInfo: () =>
        set((state) => ({
          addressInfo: {
            ...state.addressInfo,
            billingInfo: {},
          },
        })),
      clearDeliveryInfo: () =>
        secureStorage.removeItem("checkout-address-info"),
    }),
    {
      name: "checkout-address-info",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

export default useDeliveryInfo;
