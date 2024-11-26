"use client";
import { addressAvailability } from "@/stores/addressAvailability";
import { useCheckoutPlanStore, useFinalOrderStore } from "@/stores/plan/usePlanStore";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import { useDiscountStore } from "@/stores/useDiscountStore";
import { Toaster } from "sonner";
import PlanOverview from "../_components/PlanOverview";
import { usePathname } from "next/navigation";
import ApplyDiscount from "../_components/payment-form/ApplyDiscount";
import Loading from "@/app/loading";
import { useEffect, useState } from "react";
import { useKitchens } from "@/contexts/KitchenContext";
function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { checkoutPlan } = useCheckoutPlanStore();
  const { selectedAddress } = addressAvailability();
  const { addressInfo, addressId } = useDeliveryInfo();
  const {oneTimeOrder} = useFinalOrderStore();
  const {kitchens}  = useKitchens();
  const { discountType, discountValue, couponApplied } = useDiscountStore();
  const [isPageDataLoading, setIsPageDataLoading] = useState(true);
  useEffect(()=>{
    setIsPageDataLoading(false)
  },[oneTimeOrder, kitchens])
  if(isPageDataLoading){
    return <Loading/>
  }
  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 mt-12">
      <div className="w-full lg:w-2/3 bg-white ">{children}</div>
      <div className="w-full lg:w-1/3 bg-white p-2">
        <PlanOverview
          couponApplied={couponApplied}
          discountType={discountType}
          discountValue={discountValue}
          checkoutPlan={checkoutPlan}
        />
        {pathname === "/plans/checkout/payment" ||
          (pathname === "/plans/guest/checkout" &&
            addressInfo?.shippingInfo.addressLine1 &&
            selectedAddress && (
              <ApplyDiscount
                userAddress={addressInfo?.shippingInfo.addressLine1}
                addressId={addressId || ""}
              />
            ))}
      </div>
      <Toaster />
    </div>
  );
}

export default Template;
