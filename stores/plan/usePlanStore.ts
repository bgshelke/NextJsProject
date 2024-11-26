import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  Item,
  OneTimeOrderType,
  TimeSlotsType,
  UserSelectedPlan,
} from "@/types/main";
import { PlanType } from "@prisma/client";
import CryptoJS from "crypto-js";
type PlanOption = "CURRY" | "MEAL" | null;
interface PlanState {
  selectedPlan: PlanOption;
  setSelectedPlan: (plan: PlanOption) => void;
}
export const usePlanStore = create<PlanState>()((set) => ({
  selectedPlan: "MEAL",
  setSelectedPlan: (plan) => set({ selectedPlan: plan || "MEAL" }),
}));

interface EditSubscriptionDaysState {
  editSubscriptionDay: SubscriptionDay | null;
  setEditSubscriptionDay: (day: SubscriptionDay | null) => void;
}

export const useEditSubscriptionDays = create<EditSubscriptionDaysState>(
  (set) => ({
    editSubscriptionDay: null,
    setEditSubscriptionDay: (day) => set({ editSubscriptionDay: day }),
  })
);

interface ItemsState {
  items: Item[];
  editItems: Item[];
  setEditItems: (items: Item[]) => void;
  setItems: (items: Item[]) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
}

export const usePlanItemsStore = create<ItemsState>((set) => ({
  items: [],
  editItems: [],
  editMode: false,
  setItems: (items) => set({ items }),
  setEditItems: (items) => set({ editItems: items }),
  setEditMode: (mode) => set({ editMode: mode }),
}));

//Plan Type
export interface orderTiming {
  orderType: OneTimeOrderType;
  slotId?: string | null;
  pickupTime?: string,
  orderDate: Date | null;
}
interface PlanOptionInterface {
  planType: PlanType;
  oneTimeOrderOption?: orderTiming;
  setOneTimeOrderOption: (type: orderTiming) => void;
  setPlanType: (type: PlanType) => void;
  clearOneTimeOrderOption: () => void;
}
export const useOrderType = create<PlanOptionInterface>((set) => ({
  planType: "SUBSCRIPTION",
  oneTimeOrderOption: {
    orderType: "ORDERNOW",
    orderTime: null,
    orderDate: new Date(),
  },
  setOneTimeOrderOption: (type: orderTiming) =>
    set({ oneTimeOrderOption: type }),
  setPlanType: (type: PlanType) => set({ planType: type }),
  clearOneTimeOrderOption: () => set({ oneTimeOrderOption: undefined }),
}));

interface DeliveryDayState {
  selectedDeliveryDate: string | null;
  setSelectedDeliveryDate: (date: string | null) => void;
}
export const useDeliveryDayStore = create<DeliveryDayState>()((set) => ({
  selectedDeliveryDate: null,
  setSelectedDeliveryDate: (date) => set({ selectedDeliveryDate: date }),
}));

interface PickUpOption {
  selectedDeliveryOption: "PICKUP" | "DELIVERY" | null;
  setSelectedDeliveryOption: (
    deliveryOption: "PICKUP" | "DELIVERY" | null
  ) => void;
}

export const usePickUpOption = create<PickUpOption>((set) => ({
  selectedDeliveryOption: null,
  setSelectedDeliveryOption: (deliveryOption: "PICKUP" | "DELIVERY" | null) =>
    set({ selectedDeliveryOption: deliveryOption }),
}));

interface KitchenOption {
  selectedKitchen: string | null;
  setSelectedKitchen: (kitchen: string | null) => void;
}
export const useKitchenOption = create<KitchenOption>((set) => ({
  selectedKitchen: null,
  setSelectedKitchen: (kitchen: string | null) =>
    set({ selectedKitchen: kitchen }),
}));

export interface SubscriptionDay {
  date: string;
  slotId: string | null;
  items: Item[];
}

interface SubscriptionDaysState {
  selectedSubscriptionDays: SubscriptionDay[];
  setSelectedSubscriptionDays: (days: SubscriptionDay[]) => void;
  addSubscriptionDay: (day: SubscriptionDay) => void;
  updateSubscriptionDay: (day: SubscriptionDay) => void;
  clearSubscriptionDays: () => void;
  removeSubscriptionDay: (date: string) => void;
}

export const useSubscriptionDaysStore = create<SubscriptionDaysState>(
  (set) => ({
    selectedSubscriptionDays: [],
    setSelectedSubscriptionDays: (days) =>
      set({ selectedSubscriptionDays: days }),
    addSubscriptionDay: (day) =>
      set((state) => ({
        selectedSubscriptionDays: [...state.selectedSubscriptionDays, day],
      })),
    updateSubscriptionDay: (day) =>
      set((state) => ({
        selectedSubscriptionDays: state.selectedSubscriptionDays.map(d => d.date === day.date ? day : d)
      })),
    clearSubscriptionDays: () => set({ selectedSubscriptionDays: [] }),
    removeSubscriptionDay: (date) =>
      set((state) => ({
        selectedSubscriptionDays: state.selectedSubscriptionDays.filter(
          (d) => d.date !== date
        ),
      })),
  })
);


interface SelectedSubDayDateState {
  selectedSubDayDate: Date | null;
  setSelectedSubDayDate: (date: Date | null) => void;
}

export const useSelectedSubDayDate = create<SelectedSubDayDateState>((set) => ({
  selectedSubDayDate: null,
  setSelectedSubDayDate: (date) => set({ selectedSubDayDate: date }),
}));



interface FinalOrderState {
  selectedPlan: PlanOption | null;
  items: Item[];
  deliveryFees?: number;
  oneTimeOrder?: {
    orderType: string | null;
    orderDate: string | null;
    slotId?: string;
    pickupTime?: string;
    pickupOption: "PICKUP" | "DELIVERY" | null;
    selectedKitchenId?: string;
  };
  subscriptionOrder?: {
    selectedDays: SubscriptionDay[];
    deliveryDate?: string | null;
  };
  planType?: PlanType;
  subTotal: number;
  setFinalOrder: (order: Partial<FinalOrderState>) => void;
  clearFinalOrder: () => void;
  persistFinalOrder: () => void;
  getDecryptedData: () => any;
}

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY as string;

const encryptData = (data: any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

const decryptData = (encryptedData: string) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

export const useFinalOrderStore = create<FinalOrderState>()(
  persist<FinalOrderState>(
    (set) => ({
      selectedPlan: null,
      items: [],
      subTotal: 0,
      setFinalOrder: (order) =>
        set((state) => {
          if (order.planType === "ONETIME") {
            return { ...state, ...order, subscriptionOrder: undefined };
          } else if (order.planType === "SUBSCRIPTION") {
            return { ...state, ...order, oneTimeOrder: undefined };
          }
          return { ...state, ...order };
        }),
      clearFinalOrder: () =>
        set(() => {
          sessionStorage.removeItem("dwstorage");
          return {
            selectedPlan: null,
            items: [],
            oneTimeOrder: undefined,
            subscriptionOrder: undefined,
            planOption: undefined,
            subTotal: 0,
          };
        }),
      persistFinalOrder: () => {
        const state = useFinalOrderStore.getState();
        const encryptedState = encryptData(state);
        sessionStorage.setItem("dwstorage", encryptedState);
      },
      getDecryptedData: () => {
        const encryptedData = sessionStorage.getItem("dwstorage");
        if (encryptedData) {
          return decryptData(encryptedData);
        }
        return null;
      },
    }),
    {
      name: "dwstorage",
      storage: {
        getItem: (name) => {
          const encryptedData = sessionStorage.getItem(name);
          return encryptedData ? decryptData(encryptedData) : null;
        },
        setItem: (name, value) => {
          const encryptedValue = encryptData(value);
          sessionStorage.setItem(name, encryptedValue);
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({ ...state }),
    }
  )
);

//Set User Selected plan state
interface CheckoutPlanState {
  checkoutPlan: UserSelectedPlan | null;
  setCheckoutPlan: (plan: UserSelectedPlan | null) => void;
}

export const useCheckoutPlanStore = create<CheckoutPlanState>((set) => ({
  checkoutPlan: null,
  setCheckoutPlan: (plan) => set({ checkoutPlan: plan }),
}));
