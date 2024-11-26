import { AddressType, DailyMenu, MealPreference, Order, PlanType } from "@prisma/client";

export interface ResponseType {
  success: boolean;
  message: string;
  data?: any;
}
export type PlanOption = "CURRY" | "MEAL";
export type OneTimeOrderType = "SCHEDULED" | "ORDERNOW";

export interface TimeSlotsType {
  id: string;
  timeStart: string;
  timeEnd: string;
}

export type MenuData = {
  id: string;
  date: string;
  thumbnail: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface MenuType {
  id?: string;
  itemId: string;
  name: string;
}

export interface MenuItemType extends DailyMenu {
  menuItems: MenuType[];
}

export interface Item {
  id: string;
  itemName?: string;
  unit?: number;
  unitType?: string;
  planType?: PlanOption[];
  mealPreference?: MealPreference | null;
  thumbnail?: string | null;
  price?: number;
  quantity?: number;
  refundQuantity?: number;
}


export type PickupOption = "PICKUP" | "DELIVERY";
export type DabbahOrderType = "ORDERNOW" | "SCHEDULED";
export interface SubscriptionDay {
  date: string;
  slotId: string | null;
  items: Item[];
}

export interface ItemsWithQty {
  id: string;
  quantity: number;
}

export interface BillingInfo {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ShippingInfo extends BillingInfo {
  phone?: string;
  deliveryInstructions?: string;
}



export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  googleId?: string | null;
  appleId?: string | null;
  phone?: string | null;
  user: {
    isVerified: boolean;
  };
  customerUniqueId: string;
}

export interface SavedAddressType {
  id: string;
  shippingInfo: ShippingInfo;
  billingInfo: BillingInfo;
  addressType: AddressType;
  isDefault: boolean;
}


export interface Coupon {
  id: string;
  code: string;
  currentUsageCount?: number;
  isActive?: boolean;
  maxUsageLimit?: number;
  discountPercentage?: number;
  discountAmount?: number;
  usageCount?: number;
  expirationDate?: string;
  createdAt?: string;
}

export interface UserSelectedPlan {
  planName: PlanOption;
  planType: PlanType;
  oneTimeOrder?: {
    orderType: OneTimeOrderType;
    orderDate: string;
    slotId?: string | null;
    pickupTime?: string | null;
    pickupOption: PickupOption;
    selectedKitchenId?: string | null;
  };
  subscriptionOrder?: {
    subscriptionDays: SubscriptionDay[];
    deliveryDate: string;
  };
  discountCode: string | null;
  items: ItemsWithQty[] | null;
  billingInfo: BillingInfo;
  shippingInfo: ShippingInfo;
  saveAddressForLater?: boolean;
  addressId?: string | null;
}



export interface RichTextChild {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  type: string;
}

export interface RichTextBlock {
  type: string;
  level?: number;
  children: RichTextChild[];
}






export interface GoogleAutocompleteSuggestion {
  description: string;
  place_id: string;
  reference: string;
  structured_formatting: {
    main_text: string;
    main_text_matched_substrings: string[];
    secondary_text: string;
  };
  terms: string[];
  types: string[];
  details: {
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}


export interface OrderDetails extends Order {
  subscriptionDays?: string[];
  totalServings?: number;
  costPerServing?: number;
  servingsPerDay?: number;
}


export type SubOrderStatusType =
  | "ACCEPTED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "SKIPPED";

export type SubOrderStatusOptions = "ALL" | SubOrderStatusType;

export type MainOrderStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "COMPLETED"
  | "ON_HOLD"
  | "UPCOMING"
  | "REFUNDED";
export type MainOrderStatusOptions = "ALL" | MainOrderStatus;



export interface OrderItemType {
  id?: string;
  itemId: string;
  itemPrice: number;
  quantity: number;
  refundQuantity?: number;
}

export interface SavedAddress {
  id: string;
  shippingInfo: ShippingInfo;
  billingInfo: BillingInfo;
  addressType: "HOME" | "WORK";
  isDefault: boolean;
}


export interface RichTextChild {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  type: string;
}

export interface RichTextBlock {
  type: string;
  level?: number;
  children: RichTextChild[];
}


