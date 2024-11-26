import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import CryptoJS from "crypto-js";

interface AddressAvailability {
  selectedAddress: string | null;
  isAvailable?: boolean;
  address: {
    streetAddress?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  setAvailability: (availablilty: Partial<AddressAvailability>) => void;
  clearFinalOrder: () => void;
}

const encryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY as string;

const encryptedStorage = {
  getItem: (key: string): string | null => {
    const encrypted = localStorage.getItem(key);
    if (encrypted) {
      const bytes = CryptoJS.AES.decrypt(encrypted, encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    const encrypted = CryptoJS.AES.encrypt(value, encryptionKey).toString();
    localStorage.setItem(key, encrypted);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};

export const addressAvailability = create<AddressAvailability>()(
  persist(
    (set) => ({
      selectedAddress: null,
      isAvailable: false,
      address: {
        streetAddress: "",
        city: "",
        state: "",
        zip: "",
      },
      setAvailability: (availability) =>
        set((state) => ({ ...state, ...availability })),
      clearFinalOrder: () => localStorage.removeItem("addressAvailbility"),
    }),
    {
      name: "addressAvailbility",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);



interface setAddressforCoupon {
  address: string;
  setAddress: (address: string) => void;
}
export const useAddressforCoupon = create<setAddressforCoupon>()((set) => ({
  address: "",
  setAddress: (address) => set((state) => ({ ...state, address })),
}));
