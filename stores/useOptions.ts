import { PlanType } from "@prisma/client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AdditionalDays {
  showAddAdditionalDay: boolean;
  setShowAddAdditionalDay: (value: boolean) => void;
}

export const useSetAdditionalDays = create<AdditionalDays>((set) => ({
  showAddAdditionalDay: false,
  setShowAddAdditionalDay: (value: boolean) =>
    set({ showAddAdditionalDay: value }),
}));

interface LoginModal {
  isLoginModalOpen: boolean;
  setLoginModalOpen: (value: boolean) => void;
}

export const useLoginModal = create<LoginModal>((set) => ({
  isLoginModalOpen: false,
  setLoginModalOpen: (value: boolean) => set({ isLoginModalOpen: value }),
}));

interface taxRate {
  taxRate: number;
  setTaxRate: (value: number) => void;
}

export const useTaxRate = create<taxRate>((set) => ({
  taxRate: 0,
  setTaxRate: (value: number) => set({ taxRate: value }),
}));

interface PaymentSuccess {
  paymentSuccess: boolean;
  paymentData: any;
  setPaymentSuccess: (value: {
    paymentType: PlanType;
    paymentData: any;
  }) => void;
  clearPaymentSuccess: () => void;
}

export const usePaymentSuccess = create<PaymentSuccess>()(
  persist(
    (set) => ({
      paymentSuccess: false,
      paymentData: null,
      setPaymentSuccess: (value: { paymentType: PlanType; paymentData: any }) =>
        set({ paymentSuccess: true, paymentData: value }),
      clearPaymentSuccess: () =>
        set({ paymentSuccess: false, paymentData: null }),
    }),
    {
      name: "payment-success-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        paymentSuccess: state.paymentSuccess,
        paymentData: state.paymentData,
      }),

      onRehydrateStorage: () => {
        const cleanupTime = 5 * 60 * 1000;
        setTimeout(() => {
          usePaymentSuccess.setState({
            paymentSuccess: false,
            paymentData: null,
          });
        }, cleanupTime);
      },
    }
  )
);

//alert for plans
interface PlanAlertInterface {
  planAlert: {
    type: "default" | "success" | "error";
    message: string;
  };
  setPlanAlert: (value: {
    type: "default" | "success" | "error";
    message: string;
  }) => void;
  clearAlert: () => void;
}

export const usePlanAlert = create<PlanAlertInterface>((set) => ({
  planAlert: { type: "default", message: "" },
  setPlanAlert: (value: {
    type: "default" | "success" | "error";
    message: string;
  }) => set({ planAlert: value }),
  clearAlert: () => set({ planAlert: { type: "default", message: "" } }),
}));

interface RedirectState {
  redirectPath: string;
  setRedirectPath: (path: string) => void;
}

export const useRedirectStore = create<RedirectState>((set) => ({
  redirectPath: "/",
  setRedirectPath: (path) => set({ redirectPath: path }),
}));
