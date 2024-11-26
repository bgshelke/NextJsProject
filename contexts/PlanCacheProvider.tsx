"use client";
import Loading from "@/app/loading";
import { estTimeZone } from "@/lib/helper/dateFunctions";
import {
  useDeliveryDayStore,
  useFinalOrderStore,
  useKitchenOption,
  useOrderType,
  usePickUpOption,
  usePlanItemsStore,
  useSubscriptionDaysStore,
} from "@/stores/plan/usePlanStore";
import { DabbahOrderType, Item } from "@/types/main";
import { toZonedTime } from "date-fns-tz";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const PlanCacheContext = createContext(true);

// Create a provider component
export const PlanCacheProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { setSelectedDeliveryDate } = useDeliveryDayStore();
  const { setItems, setEditItems, setEditMode } = usePlanItemsStore();
  const { setSelectedDeliveryOption } = usePickUpOption();
  const { setPlanType, setOneTimeOrderOption } = useOrderType();
  const { setSelectedSubscriptionDays } = useSubscriptionDaysStore();
  const { setSelectedKitchen } = useKitchenOption();
  const [isLoading, setIsLoading] = useState(false);
  const { items, planType, oneTimeOrder, subscriptionOrder } =
    useFinalOrderStore();

  useEffect(() => {
    if (subscriptionOrder && planType === "SUBSCRIPTION") {
      setPlanType("SUBSCRIPTION");
      setIsLoading(true);
      if (subscriptionOrder.deliveryDate) {
        setSelectedDeliveryDate(subscriptionOrder?.deliveryDate);
      }
      if (subscriptionOrder.selectedDays) {
        setSelectedSubscriptionDays(subscriptionOrder.selectedDays);
      }
      setIsLoading(false);
    }
  }, [subscriptionOrder, planType]);

  useEffect(() => {
    setIsLoading(true);

    if (oneTimeOrder && planType === "ONETIME") {
      setPlanType("ONETIME");
      setSelectedDeliveryOption(oneTimeOrder.pickupOption);
      setOneTimeOrderOption({
        orderDate: oneTimeOrder.orderType === "ORDERNOW" 
          ? toZonedTime(new Date(), estTimeZone) 
          : toZonedTime(new Date(oneTimeOrder.orderDate || Date.now()), estTimeZone),
        orderType: oneTimeOrder.orderType as DabbahOrderType,
        slotId: oneTimeOrder.slotId,
        pickupTime: oneTimeOrder.pickupTime,
      });
      setSelectedKitchen(oneTimeOrder.selectedKitchenId || null);

      if (items) {
        setItems(items);
      }
    }
    setIsLoading(false);
  }, [oneTimeOrder, planType, items]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PlanCacheContext.Provider value>{children}</PlanCacheContext.Provider>
  );
};
export const usePlanCache = () => {
  const context = useContext(PlanCacheContext);
  if (context === undefined) {
    throw new Error("useMyContext must be used within a MyProvider");
  }
  return context;
};
