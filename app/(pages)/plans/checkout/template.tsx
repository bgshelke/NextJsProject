"use client";
import { useCheckoutPlanStore } from "@/stores/plan/usePlanStore";
import PlanOverview from "../_components/PlanOverview";
import { usePathname } from "next/navigation";
import { useDiscountStore } from "@/stores/useDiscountStore";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import ApplyDiscount from "../_components/payment-form/ApplyDiscount";


function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { checkoutPlan } = useCheckoutPlanStore();
  const { addressInfo, addressId } = useDeliveryInfo();
  const { discountType, discountValue, couponApplied } = useDiscountStore();
  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-center items-start gap-6 mt-12">
      <div className={`w-full md:w-2/3  ${pathname === "/plans/checkout/success" ? "" : "bg-white"}`}>{children}</div>
      {pathname !== "/plans/checkout/" && (
        <div className="w-full md:w-1/3 bg-white p-2">
          <PlanOverview
            couponApplied={couponApplied}
          discountType={discountType}
          discountValue={discountValue}
          checkoutPlan={checkoutPlan}
        />
        {pathname === "/plans/checkout/payment" &&
          addressInfo?.shippingInfo.addressLine1 && (
            <ApplyDiscount
              userAddress={addressInfo?.shippingInfo.addressLine1}
              addressId={addressId || ""}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default Template;
